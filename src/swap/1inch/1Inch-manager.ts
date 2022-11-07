import { config } from '../../config';
import { ISwapManager } from '../interfaces/ISwapManager';
import { EVMRawTransactionType, PathParams, QuoteRequestParam, SwapCostParams, SwapParams } from "../../types";
import { log } from '../../logs';
import { stringify } from '../../utils/common-utils';
import { ethers } from 'ethers';
import { ITokenPrice } from '../../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../../relayer-node-interfaces/ITransactionService';
import { IBalanceManager } from '../../gas-management/interfaces/IBalanceManager';
import { IEVMAccount } from '../../relayer-node-interfaces/IEVMAccount';

const fetch = require('node-fetch');

class OneInchManager implements ISwapManager {
  // TODO add try catch
  oneIncheTokenMap: Record<number, Record<string, string>> = {};
  swapManager: ISwapManager;
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;

  constructor(swapParams: SwapParams) {
    this.swapManager = swapParams.swapManager;
    this.tokenPriceService = swapParams.tokenPriceService;
    this.transactionServiceMap = swapParams.transactionServiceMap;
    this.balanceManager = swapParams.balanceManager;
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

  apiRequestUrl(methodName: string, chainId: number, queryParams: any): string {
    return config.oneInchApiBaseUrl + chainId + methodName + '?' + new URLSearchParams(queryParams).toString();
  }

  getSwapTokenList(chainId: number): Record<string, string> {
    return this.oneIncheTokenMap[chainId];
  }

  async initialiseSwapTokenList(chainId: number): Promise<void> {
    try {
      log.info(`getSupportedTokenList() chainId: ${chainId}`);
      const supportedTokenurl = this.apiRequestUrl('/tokens', chainId, null);

      log.info(`supportedTokenurl: ${supportedTokenurl}`);
      const response = await fetch(supportedTokenurl)
        .then((res: any) => res.json())
        .then((res: any) => res);
      log.info(`getSupportedTokenList() response: ${stringify(response)}`);

      let tokenList: Record<string, string> = {};
      for (let tokenAddress in response.tokens) {
        let symbol = response.tokens[tokenAddress].symbol;
        tokenList[symbol] = tokenAddress;
      }

      log.info(`tokenList: ${stringify(tokenList)}`);
      this.oneIncheTokenMap[chainId] = response.tokenList
      // return response.tokenList;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async getSwapCost(swapCostParams: SwapCostParams): Promise<ethers.BigNumber> {
    let fromTokenBalance = await this.balanceManager.getBalance(
      Number(swapCostParams.fromChainId),
      swapCostParams.swapFromTokenAddress
    );
    log.info(`getSwapCost() fromTokenBalance: ${fromTokenBalance.toString()}`);

    let swapToTokenAddress =
      this.oneIncheTokenMap[swapCostParams.fromChainId][config.NATIVE_TOKEN_SYMBOL[swapCostParams.toChainId]];
    log.info(`getSwapCost() swapToTokenAddress: ${swapToTokenAddress}`);

    let quoteForSwap = await this.getQuote({
      chainId: swapCostParams.fromChainId,
      fromTokenAddress: swapCostParams.swapFromTokenAddress,
      toTokenAddress: swapToTokenAddress,
      amount: fromTokenBalance
    });
    log.info(`getSwapCost() chainId: ${swapCostParams.fromChainId}, fromTokenAddress: ${swapCostParams.swapFromTokenAddress}, toTokenAddress: ${swapToTokenAddress}, amount: ${fromTokenBalance}`);

    if (!quoteForSwap && !quoteForSwap.estimatedGas) {
      throw new Error(`Error While estimating swap gas`);
    }
    let networkGasPrice = await this.transactionServiceMap[swapCostParams.fromChainId].networkService.getGasPrice();
    log.info(`getSwapCost() networkGasPrice: ${networkGasPrice.gasPrice}`);

    let swapCostInNativeCurrency = quoteForSwap.estimatedGas.mul(networkGasPrice.gasPrice);
    log.info(`getSwapCost() swapCostInNativeCurrency: ${swapCostInNativeCurrency}`);

    let tokenPriceInUsd = await this.tokenPriceService.getTokenPrice(
      config.NATIVE_TOKEN_SYMBOL[swapCostParams.fromChainId]
    );
    log.info(`getSwapCost() tokenPriceInUsd: ${tokenPriceInUsd}`);

    return swapCostInNativeCurrency.mul(tokenPriceInUsd);
  }
}

export { OneInchManager };
