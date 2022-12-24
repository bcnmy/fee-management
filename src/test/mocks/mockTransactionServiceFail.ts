import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { INonceManager } from "../../relayer-node-interfaces/INonceManager";
import { ITransactionListener } from "../../relayer-node-interfaces/ITransactionListener";
import { ITransactionService } from "../../relayer-node-interfaces/ITransactionService";
import { ErrorTransactionResponseType, EVMRawTransactionType, ExecuteTransactionParamsType, ExecuteTransactionResponseType, RawTransactionType, RetryTransactionQueueData, SuccessTransactionResponseType, TransactionDataType, TransactionType } from "../../types";
import { MockCache } from "./mockCache";
import { MockGasPrice } from "./mockGasPrice";
import { MockNetworkServiceFail } from "./mockNetworkServiceFail";
import { MockNonceManager } from "./mockNonceManager";
import { MockTransactionListener } from "./mockTransactionListerner";

export class MockTransactionServiceFail implements ITransactionService<IEVMAccount, EVMRawTransactionType>{
    chainId: number = 5;
    networkService = new MockNetworkServiceFail();
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