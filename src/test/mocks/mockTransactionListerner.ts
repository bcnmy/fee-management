import { ICacheService } from "../../relayer-node-interfaces/ICacheService";
import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { INetworkService } from "../../relayer-node-interfaces/INetworkService";
import { IQueue } from "../../relayer-node-interfaces/IQueue";
import { ITransactionDAO } from "../../relayer-node-interfaces/ITransactionDAO";
import { ITransactionListener } from "../../relayer-node-interfaces/ITransactionListener";
import { EVMRawTransactionType, NotifyTransactionListenerParamsType, RetryTransactionQueueData, TransactionListenerNotifyReturnType, TransactionQueueMessageType } from "../../types";
import { MockCache } from "./mockCache";
import { MockNetworkService } from "./mockNetworkService";
import { MockTransactionQueue } from "./mockTransactionQueue";
import { MockTransactionDao } from "./mockTransactionDao";
import { MockRetryQueue } from "./mockRetryQueue";

export class MockTransactionListener implements ITransactionListener<IEVMAccount, EVMRawTransactionType>{
    chainId: number = 5;
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType> = new MockNetworkService();
    transactionDao: ITransactionDAO = new MockTransactionDao();
    transactionQueue: IQueue<TransactionQueueMessageType> = new MockTransactionQueue();
    retryTransactionQueue: IQueue<RetryTransactionQueueData> = new MockRetryQueue();
    cacheService: ICacheService = new MockCache();
    notify(notifyTransactionListenerParams: NotifyTransactionListenerParamsType): Promise<TransactionListenerNotifyReturnType> {
        throw new Error("Method not implemented.");
    }

}