import { ISwapManager } from '../interfaces/ISwapManager';
import { AppConfig, EVMRawTransactionType, QuoteRequestParam, RouteParams, SwapCostParams, SwapParams } from "../../types";
import { log } from '../../logs';
import { stringify } from '../../utils/common-utils';
import { BigNumber, ethers } from 'ethers';
import { ITokenPrice } from '../../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../../relayer-node-interfaces/ITransactionService';
import { IBalanceManager } from '../../gas-management/interfaces/IBalanceManager';
import { IEVMAccount } from '../../relayer-node-interfaces/IEVMAccount';
import { OneInchManager } from './OneInchManager';
import { ICacheService } from '../../relayer-node-interfaces/ICacheService';
import { getOneInchTokenListKey } from '../../utils/cache-utils';
import { config } from '../../config';

const fetch = require('node-fetch');

export class CrossChainSwapManager extends OneInchManager implements ISwapManager {
  // TODO add try catch
  oneInchTokenMap: Record<number, Record<string, string>> = {};
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
  appConfig: AppConfig;
  balanceThreshold: Record<number, Record<string, number>>;
  masterFundingAccount: IEVMAccount;
  label: string;
  cacheService: ICacheService;

  constructor(swapParams: SwapParams) {
    super(swapParams.masterFundingAccount, swapParams.transactionServiceMap, swapParams.cacheService);
    this.cacheService = swapParams.cacheService;
    this.appConfig = swapParams.appConfig;
    this.tokenPriceService = swapParams.tokenPriceService;
    this.transactionServiceMap = swapParams.transactionServiceMap;
    this.balanceManager = swapParams.balanceManager;
    this.balanceThreshold = this.appConfig.balanceThreshold;
    this.masterFundingAccount = swapParams.masterFundingAccount;
    this.label = swapParams.label ? swapParams.label : "CrossChainAccountsManager"
  }

  getSwapTokenList(chainId: number): Record<string, string> {
    return this.oneInchTokenMap[chainId];
  }

  async initialiseSwapTokenList(chainId: number): Promise<void> {
    try {

      const getOneInchListFromCache = await this.cacheService.get(getOneInchTokenListKey(chainId));

      if (getOneInchListFromCache) {
        this.oneInchTokenMap[chainId] = JSON.parse(getOneInchListFromCache);
      } else {
        log.info(`getSupportedTokenList() chainId: ${chainId} `);
        const supportedTokenurl = this.apiRequestUrl('/tokens', chainId, null);

        log.info(`supportedTokenurl: ${supportedTokenurl} `);
        const response = await fetch(supportedTokenurl)
          .then((res: any) => res.json())
          .then((res: any) => res);

        let tokenList: Record<string, string> = {};
        for (let tokenAddress in response.tokens) {
          let symbol = response.tokens[tokenAddress].symbol;
          tokenList[symbol] = tokenAddress;
        }
        this.oneInchTokenMap[chainId] = tokenList

        await this.cacheService.set(getOneInchTokenListKey(chainId), JSON.stringify(tokenList));
        await this.cacheService.expire(getOneInchTokenListKey(chainId), config.oneInchTokenListExpiry);
      }
    } catch (error: any) {
      log.error(error);
      throw error;
    }
  }

  initiateSwap(chainId: number): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  async getQuote(quoteRequestParam: QuoteRequestParam) {
    try {
      log.info(`getQuote() quoteRequestParam: ${quoteRequestParam}`);
      const url = this.apiRequestUrl('/quote', quoteRequestParam.chainId, {
        fromTokenAddress: quoteRequestParam.fromTokenAddress,
        toTokenAddress: quoteRequestParam.toTokenAddress,
        amount: quoteRequestParam.amount,
      });

      log.info(`getQuote() url: ${url}`);

      const response = await fetch(url)
        .then((res: any) => res.json())
        .then((res: any) => stringify(res));
      log.info(`getQuote() response: ${stringify(response)}`);

      return response;
    } catch (error: any) {
      log.error(`Error while Getting swap Quote from 1inch api for params ${quoteRequestParam}`);
      throw new Error(error);
    }
  }

  async getSwapCost(swapCostParams: SwapCostParams): Promise<ethers.BigNumber> {
    try {
      let fromTokenBalance = await this.balanceManager.getBalance(
        Number(swapCostParams.fromChainId),
        swapCostParams.swapFromTokenAddress
      );
      log.info(`getSwapCost() fromTokenBalance: ${fromTokenBalance.toString()}`);

      let quoteForSwap = await this.getQuote({
        chainId: swapCostParams.fromChainId,
        fromTokenAddress: swapCostParams.swapFromTokenAddress,
        toTokenAddress: swapCostParams.swapToTokenAddress,
        amount: fromTokenBalance
      });
      log.info(`getSwapCost() chainId: ${swapCostParams.fromChainId}, 
      fromTokenAddress: ${swapCostParams.swapFromTokenAddress}, 
      toTokenAddress: ${swapCostParams.swapToTokenAddress}, amount: ${fromTokenBalance}`);

      if (!quoteForSwap && !quoteForSwap.estimatedGas) {
        throw new Error(`Error While estimating swap gas`);
      }
      let networkGasPrice = await this.transactionServiceMap[swapCostParams.fromChainId].getNetworkServiceInstance().getGasPrice();
      log.info(`getSwapCost() networkGasPrice: ${stringify(networkGasPrice)}`);

      let swapCostInNativeCurrency = quoteForSwap.estimatedGas.mul(networkGasPrice.gasPrice);
      log.info(`getSwapCost() swapCostInNativeCurrency: ${swapCostInNativeCurrency}`);

      let tokenPriceInUsd = await this.tokenPriceService.getTokenPrice(
        this.appConfig.nativeTokenSymbol[swapCostParams.fromChainId]
      );
      log.info(`getSwapCost() tokenPriceInUsd: ${tokenPriceInUsd}`);

      return swapCostInNativeCurrency.mul(tokenPriceInUsd);
    } catch (error: any) {
      log.error(error);
      throw error;
    }
  }

  async approveSpender(chainId: number, amount: BigNumber, tokenAddress: string): Promise<ethers.providers.TransactionResponse> {
    return super.approveSpender(chainId, amount, tokenAddress, this.label);
  }

  swapToken(route: RouteParams): Promise<ethers.providers.TransactionResponse> {
    throw new Error('Method not implemented.');
  }
}
