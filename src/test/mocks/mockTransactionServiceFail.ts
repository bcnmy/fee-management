import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { ITransactionService } from "../../relayer-node-interfaces/ITransactionService";
import { ErrorTransactionResponseType, EVMRawTransactionType, ExecuteTransactionParamsType, ExecuteTransactionResponseType, RetryTransactionQueueData, SuccessTransactionResponseType, TransactionDataType, TransactionType } from "../../types";
import { MockNetworkServiceFail } from "./mockNetworkServiceFail";
export class MockTransactionServiceFail implements ITransactionService<IEVMAccount, EVMRawTransactionType>{
    networkService = new MockNetworkServiceFail();
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