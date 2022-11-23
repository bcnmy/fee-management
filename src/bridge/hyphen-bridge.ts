import { ethers } from 'ethers';
import { config } from '../config';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { ITokenPrice } from '../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../relayer-node-interfaces/ITransactionService';
import { AppConfig, BridgeCostParams, BridgeParams, EVMRawTransactionType, ExitParams, HyphenDepositParams } from '../types';
import { IBridgeService } from './interfaces/IBridgeService';
import { log } from '../logs';
import { stringify } from '../utils/common-utils';
const fetch = require('node-fetch');

class HyphenBridge implements IBridgeService {
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;
  tokenPriceService: ITokenPrice;
  masterFundingAccount: IEVMAccount;
  liquidityPoolAddress: string;
  hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>> = {};
  appConfig: AppConfig;

  constructor(bridgeParams: BridgeParams) {
    this.appConfig = bridgeParams.appConfig;
    this.transactionService = bridgeParams.transactionService;
    this.tokenPriceService = bridgeParams.tokenPriceService;
    this.masterFundingAccount = bridgeParams.masterFundingAccount;
    this.liquidityPoolAddress = bridgeParams.liquidityPoolAddress;
  }

  // TODO: Sachin: Use in memory cache to get contract instance
  getLiquidityPoolInstance(): ethers.Contract {
    const lpContractInstance = new ethers.Contract(
      this.liquidityPoolAddress,
      config.hyphenBridgeAbi,
      this.transactionService.networkService.ethersProvider,
    );

    return lpContractInstance;
  }

  apiRequestUrl(methodName: string, queryParams: any): string {
    return config.hyphenBaseUrl + methodName + '?' + new URLSearchParams(queryParams).toString();
  }

  getBridgeTokenList(chainId: number): Record<string, Record<number, string>> {
    return this.hyphenSupportedTokenMap[chainId];
  }

  async initializeBridgeTokenList(chainId: number): Promise<void> {
    try {
      const supportedTokenurl = this.apiRequestUrl(config.hyphenSupportedTokenEndpoint, {
        networkId: chainId,
      });

      const supportedTokenResponse: any = await fetch(supportedTokenurl)
        .then((res: any) => res.json())
        .then((res: any) => res);

      let tokens: Record<string, Record<number, string>> = {};
      for (let index = 0; index < supportedTokenResponse.supportedPairList.length; index++) {
        let tokenPair = supportedTokenResponse.supportedPairList[index];
        if (tokens[tokenPair.address] == undefined) {
          tokens[tokenPair.address] = {
            [tokenPair.toChainId]: tokenPair.toChainToken,
          };
        } else {
          tokens[tokenPair.address][tokenPair.toChainId] = tokenPair.toChainToken;
        }
      }

      this.hyphenSupportedTokenMap[chainId] = tokens;
    } catch (error: any) {
      log.error(`error : ${stringify(error)}`);
      throw new Error(error);
    }
  }

  //TODO: Sachin: Keep the consistency, make exitCost method also return cost in USD
  async getExitCost(exitParams: ExitParams): Promise<number> {
    try {
      const transferFeeUrl = this.apiRequestUrl(config.hyphenTransferFeeEndpoint, {
        fromChainId: exitParams.fromChainId,
        toChainId: exitParams.toChainId,
        tokenAddress: exitParams.tokenAddress,
        amount: exitParams.transferAmount,
      });
      log.info(`transferFeeUrl : ${transferFeeUrl}`);
      const exitCostResponnse: any = await fetch(transferFeeUrl)
        .then((res: any) => res.json())
        .then((res: any) => res);

      log.info(`exitCostResponnse : ${stringify(exitCostResponnse)}`);
      return exitCostResponnse.netTransferFee;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async getDepositCost(depositParams: HyphenDepositParams): Promise<ethers.BigNumber> {
    try {
      const hyphenContract: ethers.Contract = this.getLiquidityPoolInstance();
      let rawDepositTransaction;
      let value = ethers.utils.parseEther('0');

      let depositGasSpend;
      if (depositParams.tokenAddress.toLowerCase() === config.NATIVE_ADDRESS_ROUTER) {
        log.info(`Get depositNative rawDepositTransaction`);
        rawDepositTransaction = await hyphenContract.populateTransaction.depositNative(
          depositParams.receiver,
          depositParams.toChainId,
          depositParams.tag
        );
        value = ethers.utils.parseEther(depositParams.amount.toString());

        depositGasSpend = await this.transactionService.networkService.ethersProvider.estimateGas({
          from: this.masterFundingAccount.getPublicKey(),
          to: this.appConfig.hyphenLiquidityPoolAddress[depositParams.fromChainId],
          data: rawDepositTransaction.data,
          value,
        });
      } else {
        depositGasSpend = await this.transactionService.networkService.estimateGas(
          hyphenContract,
          "depositErc20",
          [depositParams.toChainId, depositParams.tokenAddress, depositParams.receiver, depositParams.amount, depositParams.tag],
          this.masterFundingAccount.getPublicKey()
        );
      }

      log.info(`depositGasSpend: ${depositGasSpend}`);

      let networkGasPrice = await this.transactionService.networkService.getGasPrice();
      log.info(`networkGasPrice: ${stringify(networkGasPrice.gasPrice)}`);

      let depositCostInNativeCurrency = depositGasSpend.mul(networkGasPrice.gasPrice);
      log.info(`depositCostInNativeCurrency: ${depositCostInNativeCurrency} `);

      let tokenPriceInUsd = await this.tokenPriceService.getTokenPrice(
        this.appConfig.nativeTokenSymbol[depositParams.fromChainId]
      );
      log.info(`tokenPriceInUsd: ${tokenPriceInUsd}`);

      let depositCostInUsd = depositCostInNativeCurrency.mul(tokenPriceInUsd);
      log.info(`depositCostInUsd: ${depositCostInUsd}`);

      return depositCostInUsd;
    } catch (error: any) {
      log.error(error);
      throw new Error(error);
    }
  }

  async getBridgeCost(brigeCostParams: BridgeCostParams): Promise<ethers.BigNumber> {
    try {
      // estimate bridge cost
      let depositCostInUsd = await this.getDepositCost({
        fromChainId: Number(brigeCostParams.fromChainId),
        toChainId: brigeCostParams.toChainId,
        tokenAddress: brigeCostParams.fromTokenAddress,
        receiver: this.masterFundingAccount.getPublicKey(),
        amount: brigeCostParams.fromTokenBalance,
        tag: 'FEE_MANAGEMENT_SERVICE',
      });
      log.info(`getBridgeCost() depositCostInUsd: ${depositCostInUsd}, BridgeCostParams: ${stringify(brigeCostParams)}`);

      let exitCostInTransferredToken = await this.getExitCost({
        fromChainId: Number(brigeCostParams.fromChainId),
        toChainId: brigeCostParams.toChainId,
        tokenAddress: brigeCostParams.fromTokenAddress,
        transferAmount: brigeCostParams.fromTokenBalance.toString(),
      });
      log.info(`getBridgeCost() exitCostInTransferredToken: ${exitCostInTransferredToken}, BridgeCostParams: ${stringify(brigeCostParams)}`);

      let exitTokenUsdPrice;

      if (brigeCostParams.toTokenAddress.toLowerCase() === config.NATIVE_ADDRESS_ROUTER) {
        exitTokenUsdPrice = await this.tokenPriceService.getTokenPrice(
          this.appConfig.nativeTokenSymbol[brigeCostParams.toChainId]
        );
      } else {
        exitTokenUsdPrice = await this.tokenPriceService.getTokenPriceByTokenAddress(
          brigeCostParams.toChainId,
          brigeCostParams.toTokenAddress
        );
      }

      log.info(`getBridgeCost() exitTokenUsdPrice: ${exitTokenUsdPrice}, toChainId: ${brigeCostParams.toChainId}, toTokenAddress: ${brigeCostParams.toTokenAddress}`);
      let exitCostInUsd = ethers.BigNumber.from(exitCostInTransferredToken).mul(exitTokenUsdPrice);
      log.info(`getBridgeCost() exitCostInUsd: ${exitCostInUsd}`);

      return depositCostInUsd.add(exitCostInUsd);
    } catch (error: any) {
      log.error(`Error while calculating Bridge cost for params ${brigeCostParams}`);
      throw new Error(`Error while calculating Bridge cost for params ${brigeCostParams}`);
    }
  }
}

export { HyphenBridge };
