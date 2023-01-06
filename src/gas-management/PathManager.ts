// import "{ } from "./types";
import { IBridgeService } from '../bridge/interfaces/IBridgeService';
import { ISwapManager } from '../swap/interfaces/ISwapManager';
import { IPathManager } from './interfaces/IPathManager';
import { log } from '../logs';
import { ITokenPrice } from '../relayer-node-interfaces/ITokenPrice';
import {
  AppConfig,
  PathParams,
  EVMRawTransactionType,
  TokenData,
  DeltaMap,
  RouteType,
  RouteParams,
} from '../types';
import { BigNumber, ethers } from 'ethers';
import { ITransactionService } from '../relayer-node-interfaces/ITransactionService';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { IBalanceManager } from './interfaces/IBalanceManager';
import { sortArrayOfObject, stringify } from '../utils/common-utils';
class PathManager implements IPathManager {
  swapManager: ISwapManager;
  bridgeServiceMap: Record<number, IBridgeService> = {};
  // cacheService: ICacheService;
  masterFundingAccount: IEVMAccount;
  tokenList: Record<number, TokenData[]>;
  appConfig: AppConfig;
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;

  constructor(pathParams: PathParams) {
    this.swapManager = pathParams.swapManager;
    this.bridgeServiceMap = pathParams.bridgeServiceMap;
    this.masterFundingAccount = pathParams.masterFundingAccount;
    this.tokenList = pathParams.tokenList;
    this.appConfig = pathParams.appConfig;
    this.tokenPriceService = pathParams.tokenPriceService;
    this.transactionServiceMap = pathParams.transactionServiceMap;
    this.balanceManager = pathParams.balanceManager;
  }

  // 1. get token balance
  // 2. approve token to swap router
  // 3. swap
  // 3. approve swapToken to hyphen Bridge
  // 4. bridge
  // 5. update delta
  async rebalanceMFA(routes: RouteParams[], deltaMap: Record<number, number>): Promise<any> {
    try {
      for (let chainId in deltaMap) {
        let delta = BigNumber.from(deltaMap[Number(chainId)]);

        for (let routeIndex = 0; routeIndex < routes.length; routeIndex++) {
          let route = routes[routeIndex];
          //TODO: Add threshold instead of 0
          if (delta.lte(0)) {
            log.info(`Rebalancing complete`);
            break;
          };

          if (route.action === RouteType.SWAP_N_BRIDGE) {
            let tokenBalance = await this.balanceManager.getBalance(route.fromChainId, route.tokenAddress);
            let swapToTokenAddress = this.swapManager.getSwapTokenList(route.fromChainId)[this.appConfig.nativeTokenSymbol[route.toChainId]];
            if (tokenBalance.gt(0)) {
              let dexAllowance = await this.swapManager.checkDexAllowance(route.fromChainId, route.tokenAddress);
              if (tokenBalance.gt(dexAllowance.toString())) {
                let approveTokenResponse = await this.swapManager.approveSpender(route.fromChainId, tokenBalance, route.tokenAddress);
                let approveReceipt = await this.transactionServiceMap[route.fromChainId].networkService.waitForTransaction(approveTokenResponse.hash, this.appConfig.noOfBlockConfirmation[chainId]);
                if (!approveReceipt || approveReceipt.status === 0) {
                  //TODO: Add logs here
                  break;
                }
              }

              let swapTxnResponse = await this.swapManager.swapToken(route);
              let swapReceipt = await this.transactionServiceMap[route.fromChainId].networkService.waitForTransaction(swapTxnResponse.hash, this.appConfig.noOfBlockConfirmation[chainId]);

              if (swapReceipt && swapReceipt.status === 1) {
                // swap successfull
                let swapTokenBalance = await this.balanceManager.getBalance(route.fromChainId, route.tokenAddress);
                let bridgeAllowance = await this.bridgeServiceMap[route.fromChainId].checkBridgeAllowane(route.fromChainId, swapToTokenAddress);
                if (tokenBalance.gt(bridgeAllowance.toString())) {
                  let approveTokenToDexHash = await this.swapManager.approveSpender(route.fromChainId, swapTokenBalance, swapToTokenAddress);
                  let approveReceipt = await this.transactionServiceMap[route.fromChainId].networkService.waitForTransaction(approveTokenToDexHash.hash, this.appConfig.noOfBlockConfirmation[chainId]);
                  if (!approveReceipt || approveReceipt.status === 0) {
                    break;
                  }
                }
              }
            }
            log.info(`Rebalancing complete`);
          } else if (route.action === RouteType.BRIDGE_N_SWAP) {
            log.info(`Rebalancing complete`);
          };
          delta = delta.sub(route.costInUsd);
        }
      }
    } catch (error) {

    }
  }

  /**
   * Rebalancing can happen in 2 ways
   * First swap and then bridge or First Bridge and then swap. 
   * @param deltaMap consist of two Maps, 1st map which is low on fund & 2nd chains which has funds in access
   * @param toChainId which has low funds in master Account
   * @returns Array of all possible routes and their cost
   */
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
        routes.sort(sortArrayOfObject('costInUsd'));
      }

      log.info(`All possible routes: ${stringify(routes)}`);
      return routes;
    } catch (error: any) {
      log.error(`Error while calculating all possible routes and their cost ${stringify(error)}`);
      throw new Error(`Error while calculating all possible routes and their cost ${stringify(error)}`);
    }
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
      let toTokenAddress = this.bridgeServiceMap[fromChainId].getBridgeTokenList(fromChainId)[fromTokenAddress][toChainId];

      log.info(`BridgeNSwap() fromChainId: ${fromChainId}, toChainId: ${toChainId}, fromTokenAddress: ${fromTokenAddress}, toTokenAddress: ${toTokenAddress}`);

      // TODO check if exit is allowed for swappedtokenAddress
      let bridgeCostUsd = await this.bridgeServiceMap[fromChainId].getBridgeCost({
        fromChainId: fromChainId,
        toChainId: toChainId,
        fromTokenAddress: fromTokenAddress,
        toTokenAddress: toTokenAddress,
        fromTokenBalance: fromTokenBalance,
      });
      log.info(`BridgeNSwap() fromChainId: ${fromChainId}, toChainId: ${toChainId},fromTokenAddress: ${fromTokenAddress},
      toTokenAddress: ${toTokenAddress},fromTokenBalance: ${fromTokenBalance},bridgeCostUsd: ${bridgeCostUsd}`);

      // estimate swap cost
      let swapCostInUsd = await this.swapManager.getSwapCost({
        swapFromTokenAddress: toTokenAddress,
        fromChainId: toChainId,
        toChainId: fromChainId,
        swapToTokenAddress: this.swapManager.getSwapTokenList(toChainId)[this.appConfig.nativeTokenSymbol[fromChainId]]
      });
      log.info(`BridgeNSwap() swapFromTokenAddress: ${toTokenAddress}, fromChainId: ${toChainId}, toChainId: ${fromChainId}, swapCostInUsd: ${swapCostInUsd}`);

      let bridgeAndSwapCostInUsd = swapCostInUsd.add(bridgeCostUsd);
      log.info(`BridgeNSwap() bridgeAndSwapCostInUsd: ${bridgeAndSwapCostInUsd}`);
      return bridgeAndSwapCostInUsd;
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
    try {
      let fromTokenBalance = await this.balanceManager.getBalance(Number(fromChainId), fromTokenAddress);
      log.info(`SwapNBridge() fromChainId: ${fromChainId}, fromTokenAddress: ${fromTokenAddress} fromTokenBalance: ${fromTokenBalance}`);
      let swapToTokenAddress = this.swapManager.getSwapTokenList(fromChainId)[this.appConfig.nativeTokenSymbol[toChainId]];

      log.info(`SwapNBridge() fromChainId: ${fromChainId}, toChainId: ${toChainId}, fromTokenAddress: ${fromTokenAddress}, swapToTokenAddress: ${swapToTokenAddress}`);

      // estimate swap cost
      let swapCostInUsd = await this.swapManager.getSwapCost({
        swapFromTokenAddress: fromTokenAddress,
        fromChainId: fromChainId,
        toChainId: toChainId,
        swapToTokenAddress: swapToTokenAddress
      });

      log.info(`SwapNBridge() fromTokenAddress: ${fromTokenAddress}, toChainId: ${toChainId},
      fromChainId: ${fromChainId}, swapCostInUsd: ${swapCostInUsd}`);

      let toTokenAddress = this.bridgeServiceMap[fromChainId].getBridgeTokenList(fromChainId)[fromTokenAddress][toChainId];
      // TODO check if exit is allowed for swappedtokenAddress
      let bridgeCostUsd = await this.bridgeServiceMap[fromChainId].getBridgeCost({
        fromChainId: fromChainId,
        toChainId: toChainId,
        fromTokenAddress: swapToTokenAddress,
        toTokenAddress,
        fromTokenBalance: fromTokenBalance,
      });

      log.info(`SwapNBridge() fromChainId: ${fromChainId}, toChainId: ${toChainId}, fromTokenAddress: ${fromTokenAddress}, fromTokenBalance: ${fromTokenBalance}
    toTokenAddress: ${toTokenAddress}, bridgeCostUsd: ${bridgeCostUsd}`);

      let swapNBridgeCostInUsd = swapCostInUsd.add(bridgeCostUsd);
      log.info(`SwapNBridge() swapNBridgeCostInUsd: ${swapNBridgeCostInUsd}`);

      return swapNBridgeCostInUsd;
    } catch (error: any) {
      log.error(error);
      throw error;
    }
  }
}

export { PathManager };
