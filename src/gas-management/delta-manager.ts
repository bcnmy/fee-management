// import "{ } from "./types";
import { ICacheService } from "../relayer-node-interfaces/ICacheService";
import { ITokenPrice } from "../relayer-node-interfaces/ITokenPrice";
import {
  AppConfig,
  DeltaManagerParams,
  DeltaMap,
  EVMRawTransactionType,
  MasterFundingAccount,
  TokenData,
} from "../types";
import { IDeltaManager } from "./interfaces/IDeltaManager";
import { BigNumber, ethers } from "ethers";
import { getErc20TokenBalance, getNativeTokenBalance } from "../utils/token-utils";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { config, NATIVE_ADDRESS } from "../config";
import { IBalanceManager } from "./interfaces/IBalanceManager";
class DeltaManager implements IDeltaManager {
  cacheService: ICacheService;
  masterFundingAccount: MasterFundingAccount;
  appConfig: AppConfig;
  providerMap: Record<number, ethers.providers.JsonRpcProvider>;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;

  constructor(deltaManagerParams: DeltaManagerParams) {
    this.cacheService = deltaManagerParams.cacheService;
    this.masterFundingAccount = deltaManagerParams.masterFundingAccount;
    this.appConfig = deltaManagerParams.appConfig;
    this.transactionServiceMap = deltaManagerParams.transactionServiceMap;
    this.balanceManager = deltaManagerParams.balanceManager;
  }

  async calculateDelta(mfaUSDBalanceMap: Map<number, number>, chainToRebalance: number): Promise<DeltaMap> {
    // TODO: Sachin: Set its type - done
    let positiveDeltaMap: Map<number, number> = new Map(); // chains where funds are below Initial Funding Amount
    let negativeDeltaMap: Map<number, number> = new Map(); // chains where funds are above Initial Funding Amount
    try {
      for (let chainId in mfaUSDBalanceMap) {
        let deltaValue = this.appConfig.InitialFundingAmountInUsd[chainId] - mfaUSDBalanceMap[chainId];
        if (deltaValue > 0 && chainId === chainToRebalance.toString()) {
          positiveDeltaMap[chainId] += deltaValue;
        } else if (deltaValue < 0) {
          negativeDeltaMap[chainId] += deltaValue;
        }
      }
    } catch (error) {
      throw new Error(`Error while calculating chain wise Delta ${JSON.stringify(error)}`);
    }
    return {
      positiveDeltaMap: positiveDeltaMap,
      negativeDeltaMap: negativeDeltaMap,
    };
  }
}
export { DeltaManager };
