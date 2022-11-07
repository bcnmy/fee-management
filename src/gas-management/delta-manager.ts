// import "{ } from "./types";
import { ICacheService } from '../relayer-node-interfaces/ICacheService';
import {
  AppConfig,
  DeltaManagerParams,
  DeltaMap,
  EVMRawTransactionType
} from '../types';
import { IDeltaManager } from './interfaces/IDeltaManager';
import { ITransactionService } from '../relayer-node-interfaces/ITransactionService';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { log } from '../logs';
import { IBalanceManager } from './interfaces/IBalanceManager';
import { stringify } from '../utils/common-utils';
class DeltaManager implements IDeltaManager {
  cacheService: ICacheService;
  masterFundingAccount: IEVMAccount;
  appConfig: AppConfig;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;

  constructor(deltaManagerParams: DeltaManagerParams) {
    this.cacheService = deltaManagerParams.cacheService;
    this.masterFundingAccount = deltaManagerParams.masterFundingAccount;
    this.appConfig = deltaManagerParams.appConfig;
    this.transactionServiceMap = deltaManagerParams.transactionServiceMap;
    this.balanceManager = deltaManagerParams.balanceManager;
  }

  async calculateDelta(mfaUSDBalanceMap: Record<number, number>, chainToRebalance: number): Promise<DeltaMap> {
    // TODO: Sachin: Set its type - done
    let positiveDeltaMap: Record<number, number> = {}; // chains where funds are below Initial Funding Amount
    let negativeDeltaMap: Record<number, number> = {}; // chains where funds are above Initial Funding Amount
    log.info(`calculateDelta chainwise to find out where extra funds are lying`);
    try {
      for (let chainId in mfaUSDBalanceMap) {
        let deltaValue = this.appConfig.InitialFundingAmountInUsd[Number(chainId)] - mfaUSDBalanceMap[Number(chainId)];
        if (deltaValue > 0 && chainId === chainToRebalance.toString()) {
          positiveDeltaMap[Number(chainId)] += deltaValue;
        } else if (deltaValue < 0) {
          negativeDeltaMap[Number(chainId)] += deltaValue;
        }
      }
    } catch (error: any) {
      log.error(`Error while calculating chain wise Delta ${stringify(error)}`);
      throw new Error(`Error while calculating chain wise Delta ${stringify(error)}`);
    }
    return {
      positiveDeltaMap: positiveDeltaMap,
      negativeDeltaMap: negativeDeltaMap,
    };
  }
}
export { DeltaManager };
