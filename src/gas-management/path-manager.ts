// import "{ } from "./types";
import { IBridgeService } from '../bridge/interfaces/IBridgeService';
import { ISwapManager } from '../swap/interfaces/ISwapManager';
import { IPathManager } from './interfaces/IPathManager';
import { ICacheService } from '../relayer-node-interfaces/ICacheService';
import { log } from '../logs';
import { ITokenPrice } from '../relayer-node-interfaces/ITokenPrice';
import {
  AppConfig,
  PathParams,
  EVMRawTransactionType,
  MasterFundingAccount,
  TokenData,
  DeltaMap,
  BridgeCostParams,
  SwapCostParams,
  RouteType,
  RouteParams,
} from '../types';
import { BigNumber, ethers } from 'ethers';
import { ITransactionService } from '../relayer-node-interfaces/ITransactionService';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { config, NATIVE_ADDRESS } from '../config';
import { IBalanceManager } from './interfaces/IBalanceManager';
import { stringify } from '../utils/common-utils';
class PathManager implements IPathManager {
  swapManager: ISwapManager;
  bridgeService: IBridgeService;
  // cacheService: ICacheService;
  masterFundingAccount: IEVMAccount;
  tokenList: Record<number, TokenData[]>;
  appConfig: AppConfig;
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
  hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>> = {};
  oneIncheTokenMap: Record<number, Record<string, string>> = {};

  constructor(pathParams: PathParams) {
    this.swapManager = pathParams.swapManager;
    this.bridgeService = pathParams.bridgeService;
    this.masterFundingAccount = pathParams.masterFundingAccount;
    this.tokenList = pathParams.tokenList;
    this.appConfig = pathParams.appConfig;
    this.tokenPriceService = pathParams.tokenPriceService;
    this.transactionServiceMap = pathParams.transactionServiceMap;
    this.balanceManager = pathParams.balanceManager;
  }
  setOneInchSupportedTokenMap(oneIncheTokenMap: Record<number, Record<string, string>>) {
    this.oneIncheTokenMap = oneIncheTokenMap;
    log.info(`Set oneIncheTokenMap successful`);
  }

  setHyphenSupportedTokenMap(hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>>) {
    this.hyphenSupportedTokenMap = hyphenSupportedTokenMap;
    log.info(`Set hyphenSupportedTokenMap successful`);
  }

  async findAllRoutes(deltaMap: DeltaMap, toChainId: number): Promise<Array<RouteParams>> {
    let routes: Array<RouteParams> = new Array();
    try {
      log.info(`Find all possible Routes and their Cost`);
      for (let fromChainId in deltaMap.negativeDeltaMap) {
        for (
          let tokenRecordIndex = 0;
          tokenRecordIndex < this.tokenList[Number(fromChainId)].length;
          tokenRecordIndex++
        ) {
          try {
            let swapNBridgeCostInUsd = await this.getSwapNBridgeCost(
              Number(fromChainId),
              toChainId,
              this.tokenList[Number(fromChainId)][tokenRecordIndex].address
            );

            let swapNBridgeObj: RouteParams = {
              costInUsd: swapNBridgeCostInUsd,
              fromChainId: Number(fromChainId),
              toChainId: toChainId,
              tokenAddress: this.tokenList[Number(fromChainId)][tokenRecordIndex].address,
              action: RouteType.SWAP_N_BRIDGE,
            };

            routes.push(swapNBridgeObj);
          } catch (error) {
            log.error(`Error while getting getSwapNBridgeCost, Skipp cost calculation for fromChainId: ${fromChainId}, toChainId: ${toChainId}
            tokenAddress: ${this.tokenList[Number(fromChainId)][tokenRecordIndex].address}`);
          }

          try {
            let bridgeNSwapCostInUsd = await this.getBridgeNSwapCost(
              Number(fromChainId),
              toChainId,
              this.tokenList[Number(fromChainId)][tokenRecordIndex].address
            );

            let bridgeNSwapObj: RouteParams = {
              costInUsd: bridgeNSwapCostInUsd,
              fromChainId: Number(fromChainId),
              toChainId: toChainId,
              tokenAddress: this.tokenList[Number(fromChainId)][tokenRecordIndex].address,
              action: RouteType.BRIDGE_N_SWAP,
            };

            routes.push(bridgeNSwapObj);
          } catch (error) {
            log.error(`Error while getting getBridgeNSwapCost, Skip cost calculation for fromChainId: ${fromChainId}, toChainId: ${toChainId}
            tokenAddress: ${this.tokenList[Number(fromChainId)][tokenRecordIndex].address}`);
          }
        }
      }

      log.info(`No. of all possible routes: ${routes.length}`);
      if (routes.length > 0) {
        routes.sort(this.getSortRoute('costInUsd'));
      }

      log.info(`All possible routes: ${stringify(routes)}`);
      return routes;
    } catch (error: any) {
      log.error(`Error while calculating all possible routes and their cost ${stringify(error)}`);
      throw new Error(`Error while calculating all possible routes and their cost ${stringify(error)}`);
    }
  }

  getSortRoute(sortAttribute: string) {
    return function (firstEntry: any, secondEntry: any) {
      if (firstEntry[sortAttribute] > secondEntry[sortAttribute]) {
        return 1;
      } else if (firstEntry[sortAttribute] < secondEntry[sortAttribute]) {
        return -1;
      }
      return 0;
    };
  }

  //TODO: Sachin: Create separate functions to calculate bridge and swap cost and use them here in proper order
  async getBridgeNSwapCost(
    fromChainId: number,
    toChainId: number,
    fromTokenAddress: string
  ): Promise<ethers.BigNumber> {
    try {
      let fromTokenBalance = await this.balanceManager.getBalance(Number(fromChainId), fromTokenAddress);
      log.info(`BridgeNSwap() fromChainId: ${fromChainId}, fromTokenAddress: ${fromTokenAddress} fromTokenBalance: ${fromTokenBalance}`);
      let toTokenAddress = this.hyphenSupportedTokenMap[fromChainId][fromTokenAddress][toChainId];
      log.info(`BridgeNSwap() fromChainId: ${fromChainId}, toChainId: ${toChainId}, fromTokenAddress: ${fromTokenAddress}, toTokenAddress: ${toTokenAddress}`);

      // TODO check if exit is allowed for swappedtokenAddress
      let bridgeCostUsd = await this.getBridgeCost({
        fromChainId: fromChainId,
        toChainId: toChainId,
        fromTokenAddress: fromTokenAddress,
        toTokenAddress: toTokenAddress,
        fromTokenBalance: fromTokenBalance,
      });
      log.info(`BridgeNSwap() fromChainId: ${fromChainId}, toChainId: ${toChainId},fromTokenAddress: ${fromTokenAddress},
      toTokenAddress: ${toTokenAddress},fromTokenBalance: ${fromTokenBalance},bridgeCostUsd: ${bridgeCostUsd}`);

      // estimate swap cost
      let swapCostInUsd = await this.getSwapCost({
        swapFromTokenAddress: toTokenAddress,
        fromChainId: toChainId,
        toChainId: fromChainId
      });
      log.info(`BridgeNSwap() swapFromTokenAddress: ${toTokenAddress}, fromChainId: ${toChainId}, toChainId: ${fromChainId}, swapCostInUsd: ${swapCostInUsd}`);

      let swapNBridgeCostInUsd = swapCostInUsd.add(bridgeCostUsd);
      log.info(`BridgeNSwap() swapNBridgeCostInUsd: ${swapNBridgeCostInUsd}`);
      return swapNBridgeCostInUsd;
    } catch (error: any) {
      log.error(error);
      throw error;
    }
  }

  // TODO: Logs & Error handling
  async getSwapNBridgeCost(
    fromChainId: number,
    toChainId: number,
    fromTokenAddress: string
  ): Promise<ethers.BigNumber> {
    let fromTokenBalance = await this.balanceManager.getBalance(Number(fromChainId), fromTokenAddress);
    log.info(`SwapNBridge() fromChainId: ${fromChainId}, fromTokenAddress: ${fromTokenAddress} fromTokenBalance: ${fromTokenBalance}`);
    let swapToTokenAddress = this.oneIncheTokenMap[fromChainId][config.NATIVE_TOKEN_SYMBOL[toChainId]];
    log.info(`SwapNBridge() fromChainId: ${fromChainId}, toChainId: ${toChainId}, fromTokenAddress: ${fromTokenAddress}, swapToTokenAddress: ${swapToTokenAddress}`);

    // estimate swap cost
    let swapCostInUsd = await this.getSwapCost({
      swapFromTokenAddress: fromTokenAddress,
      fromChainId: fromChainId,
      toChainId: toChainId,
    });

    log.info(`SwapNBridge() fromTokenAddress: ${fromTokenAddress}, toChainId: ${toChainId},fromChainId: ${fromChainId}, swapCostInUsd: ${swapCostInUsd}`);

    // TODO check if exit is allowed for swappedtokenAddress
    let bridgeCostUsd = await this.getBridgeCost({
      fromChainId: fromChainId,
      toChainId: toChainId,
      fromTokenAddress: swapToTokenAddress,
      toTokenAddress: this.hyphenSupportedTokenMap[fromChainId][swapToTokenAddress][toChainId],
      fromTokenBalance: fromTokenBalance,
    });

    log.info(`SwapNBridge() fromChainId: ${fromChainId}, toChainId: ${toChainId}, fromTokenAddress: ${fromTokenAddress}, fromTokenBalance: ${fromTokenBalance}
    toTokenAddress: ${this.hyphenSupportedTokenMap[fromChainId][swapToTokenAddress][toChainId]}, bridgeCostUsd: ${bridgeCostUsd}`);

    let swapNBridgeCostInUsd = swapCostInUsd.add(bridgeCostUsd);
    log.info(`SwapNBridge() swapNBridgeCostInUsd: ${swapNBridgeCostInUsd}`);

    return swapNBridgeCostInUsd;
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

    let quoteForSwap = await this.swapManager.getQuote({
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

  async getBridgeCost(brigeCostParams: BridgeCostParams): Promise<ethers.BigNumber> {
    try {
      // estimate bridge cost
      let depositCostInUsd = await this.bridgeService.getDepositCost({
        fromChainId: Number(brigeCostParams.fromChainId),
        toChainId: brigeCostParams.toChainId,
        tokenAddress: brigeCostParams.fromTokenAddress,
        receiver: this.masterFundingAccount.getPublicKey(),
        amount: brigeCostParams.fromTokenBalance,
        tag: 'FEE_MANAGEMENT_SERVICE',
      });
      log.info(`getBridgeCost() depositCostInUsd: ${depositCostInUsd}, BridgeCostParams: ${stringify(brigeCostParams)}`);

      let exitCostInTransferredToken = await this.bridgeService.getExitCost({
        fromChainId: Number(brigeCostParams.fromChainId),
        toChainId: brigeCostParams.toChainId,
        tokenAddress: brigeCostParams.fromTokenAddress,
        transferAmount: brigeCostParams.fromTokenBalance.toString(),
      });
      log.info(`getBridgeCost() exitCostInTransferredToken: ${exitCostInTransferredToken}, BridgeCostParams: ${stringify(brigeCostParams)}`);

      let exitTokenUsdPrice;

      if (brigeCostParams.toTokenAddress.toLowerCase() === config.NATIVE_ADDRESS) {
        exitTokenUsdPrice = await this.tokenPriceService.getTokenPrice(
          config.NATIVE_TOKEN_SYMBOL[brigeCostParams.toChainId]
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

export { PathManager };
