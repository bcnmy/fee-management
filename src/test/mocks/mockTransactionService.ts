import { ICacheService } from "../../relayer-node-interfaces/ICacheService";
import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { IGasPrice } from "../../relayer-node-interfaces/IGasPrice";
import { INetworkService } from "../../relayer-node-interfaces/INetworkService";
import { INonceManager } from "../../relayer-node-interfaces/INonceManager";
import { ITransactionListener } from "../../relayer-node-interfaces/ITransactionListener";
import { ITransactionService } from "../../relayer-node-interfaces/ITransactionService";
import { ErrorTransactionResponseType, EVMRawTransactionType, ExecuteTransactionParamsType, ExecuteTransactionResponseType, RawTransactionType, RetryTransactionQueueData, SuccessTransactionResponseType, TransactionDataType, TransactionType } from "../../types";
import { MockCache } from "./mockCache";
import { MockGasPrice } from "./mockGasPrice";
import { MockNetworkService } from "./mockNetworkService";
import { MockNonceManager } from "./mockNonceManager";
import { MockTransactionListener } from "./mockTransactionListerner";

export class MockTransactionService implements ITransactionService<IEVMAccount, EVMRawTransactionType>{
    chainId: number = 5;
    networkService = new MockNetworkService();
    transactionListener: ITransactionListener<IEVMAccount, EVMRawTransactionType> = new MockTransactionListener();
    nonceManager: INonceManager<IEVMAccount, EVMRawTransactionType> = new MockNonceManager();
    gasPriceService = new MockGasPrice();
    cacheService = new MockCache();
    executeTransaction(executeTransactionParams: ExecuteTransactionParamsType): Promise<ExecuteTransactionResponseType> {
        throw new Error("Method not implemented.");
    }
    sendTransaction(transaction: TransactionDataType, account: IEVMAccount, transactionType: TransactionType, relayerManagerName: string): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
        throw new Error("Method not implemented.");
    }
    retryTransaction(transaction: RetryTransactionQueueData, account: IEVMAccount, tranasctionType: TransactionType, relayerManagerName: string): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType> {
        throw new Error("Method not implemented.");
    }

}