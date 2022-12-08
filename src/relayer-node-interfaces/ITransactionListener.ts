import { ITransactionDAO } from './ITransactionDAO';
import { IQueue } from './IQueue';
import { INetworkService } from './INetworkService';
import { NotifyTransactionListenerParamsType, RetryTransactionQueueData, TransactionListenerNotifyReturnType, TransactionQueueMessageType } from '../types';
import { ICacheService } from './ICacheService';

export interface ITransactionListener<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionDao: ITransactionDAO;
  transactionQueue: IQueue<TransactionQueueMessageType>;
  retryTransactionQueue: IQueue<RetryTransactionQueueData>;
  cacheService: ICacheService;

  notify(notifyTransactionListenerParams: NotifyTransactionListenerParamsType):
    Promise<TransactionListenerNotifyReturnType>
}
