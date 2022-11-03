// import "{ } from "./types";
import { IBridgeService } from "../bridge/interfaces/IBridgeService";
import { ISwapManager } from "../swap/interfaces/ISwapManager";
import { IPathManager } from "./interfaces/IPathManager";
import { ICacheService } from "../relayer-node-interfaces/ICacheService";
import { ITokenPrice } from "../relayer-node-interfaces/ITokenPrice";
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
} from "../types";
import { BigNumber, ethers } from "ethers";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { config, NATIVE_ADDRESS } from "../config";
import { IBalanceManager } from "./interfaces/IBalanceManager";
class PathManager implements IPathManager {
  swapManager: ISwapManager;
  bridgeService: IBridgeService;
  cacheService: ICacheService;
  masterFundingAccount: MasterFundingAccount;
  tokenList: Record<number, TokenData[]>;
  appConfig: AppConfig;
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
  hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>>;
  oneIncheTokenMap: Record<number, Record<string, string>>;

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
  }

  setHyphenSupportedTokenMap(hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>>) {
    this.hyphenSupportedTokenMap = hyphenSupportedTokenMap;
  }

  async findAllRoutes(deltaMap: DeltaMap, toChainId: number): Promise<Array<RouteParams>> {
    let routes: Array<RouteParams> = new Array();
    try {
      for (let fromChainId in deltaMap.negativeDeltaMap) {
        for (let tokenRecordIndex = 0; tokenRecordIndex < this.tokenList[fromChainId].length; tokenRecordIndex++) {
          let swapNBridgeCostInUsd = await this.getSwapNBridgeCost(
            Number(fromChainId),
            toChainId,
            this.tokenList[fromChainId][tokenRecordIndex].address
          );

          let swapNBridgeObj: RouteParams = {
            costInUsd: swapNBridgeCostInUsd,
            fromChainId: Number(fromChainId),
            toChainId: toChainId,
            tokenAddress: this.tokenList[fromChainId][tokenRecordIndex].address,
            action: RouteType.SWAP_N_BRIDGE,
          };

          routes.push(swapNBridgeObj);

          let bridgeNSwapCostInUsd = await this.getBridgeNSwapCost(
            Number(fromChainId),
            toChainId,
            this.tokenList[fromChainId][tokenRecordIndex].address
          );

          let bridgeNSwapObj: RouteParams = {
            costInUsd: bridgeNSwapCostInUsd,
            fromChainId: Number(fromChainId),
            toChainId: toChainId,
            tokenAddress: this.tokenList[fromChainId][tokenRecordIndex].address,
            action: RouteType.BRIDGE_N_SWAP,
          };

          routes.push(bridgeNSwapObj);
        }
      }

      if (routes.length > 0) {
        routes.sort(this.getSortRoute(routes, "costInUsd"));
      }

      return routes;
    } catch (error) {
      throw new Error(error);
    }
  }

  getSortRoute(routes: Array<RouteParams>, sortAttribute: string) {
    return function (firstEntry, secondEntry) {
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
    let fromTokenBalance = await this.balanceManager.getBalance(Number(fromChainId), fromTokenAddress);
    let toTokenAddress = this.hyphenSupportedTokenMap[fromChainId][fromTokenAddress][toChainId];

    // TODO check if exit is allowed for swappedtokenAddress
    let bridgeCostUsd = await this.getBridgeCost({
      fromChainId: fromChainId,
      toChainId: toChainId,
      fromTokenAddress: fromTokenAddress,
      toTokenAddress: toTokenAddress,
      fromTokenBalance: fromTokenBalance,
    });

    // estimate swap cost

    let swapCostInUsd = await this.getSwapCost({
      swapFromTokenAddress: toTokenAddress,
      chainId: toChainId,
    });

    let swapNBridgeCostInUsd = swapCostInUsd.add(bridgeCostUsd);
    return swapNBridgeCostInUsd;
  }

  // TODO: Logs & Error handling
  async getSwapNBridgeCost(
    fromChainId: number,
    toChainId: number,
    fromTokenAddress: string
  ): Promise<ethers.BigNumber> {
    let fromTokenBalance = await this.balanceManager.getBalance(Number(fromChainId), fromTokenAddress);
    let swapToTokenAddress = this.oneIncheTokenMap[fromChainId][config.NATIVE_TOKEN_SYMBOL[toChainId]];

    // estimate swap cost
    let swapCostInUsd = await this.getSwapCost({
      swapFromTokenAddress: fromTokenAddress,
      chainId: fromChainId,
    });

    // TODO check if exit is allowed for swappedtokenAddress
    let bridgeCostUsd = await this.getBridgeCost({
      fromChainId: fromChainId,
      toChainId: toChainId,
      fromTokenAddress: swapToTokenAddress,
      toTokenAddress: this.hyphenSupportedTokenMap[fromChainId][swapToTokenAddress][toChainId],
      fromTokenBalance: fromTokenBalance,
    });

    let costInUsd = swapCostInUsd.add(bridgeCostUsd);
    return costInUsd;
  }

  async getSwapCost(swapCostParams: SwapCostParams): Promise<ethers.BigNumber> {
    let toTokenBalance = await this.balanceManager.getBalance(
      Number(swapCostParams.chainId),
      swapCostParams.swapFromTokenAddress
    );

    let swapToTokenAddress =
      this.oneIncheTokenMap[swapCostParams.chainId][config.NATIVE_TOKEN_SYMBOL[swapCostParams.chainId]];

    let quoteForSwap = await this.swapManager.getQuote(
      swapCostParams.chainId,
      swapCostParams.swapFromTokenAddress,
      swapToTokenAddress,
      toTokenBalance
    );

    let networkGasPrice = await this.transactionServiceMap[swapCostParams.chainId].networkService.getGasPrice();
    let swapCostInNativeCurrency = quoteForSwap.estimatedGas.mul(networkGasPrice.gasPrice);

    let tokenPriceInUsd = await this.tokenPriceService.getTokenPrice(
      config.NATIVE_TOKEN_SYMBOL[swapCostParams.chainId]
    );

    return swapCostInNativeCurrency.mul(tokenPriceInUsd);
  }

  async getBridgeCost(brigeCostParams: BridgeCostParams): Promise<ethers.BigNumber> {
    try {
      // estimate bridge cost
      let depositCostInUsd = await this.bridgeService.getDepositCost({
        fromChainId: Number(brigeCostParams.fromChainId),
        toChainId: brigeCostParams.toChainId,
        tokenAddress: brigeCostParams.fromTokenAddress,
        receiver: this.masterFundingAccount.publicAddress,
        amount: brigeCostParams.fromTokenBalance,
        tag: "FEE_MANAGEMENT_SERVICE",
      });

      let exitCostInTransferredToken = await this.bridgeService.getExitCost({
        fromChainId: Number(brigeCostParams.fromChainId),
        toChainId: brigeCostParams.toChainId,
        tokenAddress: brigeCostParams.fromTokenAddress,
        transferAmount: brigeCostParams.fromTokenBalance.toString(),
      });

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

      let exitCostInUsd = ethers.BigNumber.from(exitCostInTransferredToken).mul(exitTokenUsdPrice);

      return depositCostInUsd.add(exitCostInUsd);
    } catch (error) {
      throw new Error(`Error while calculating Bridge cost for params ${brigeCostParams}`);
    }
  }
}

export { PathManager };
