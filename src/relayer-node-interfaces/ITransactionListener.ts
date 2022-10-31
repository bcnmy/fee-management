import { ITransactionDAO } from './ITransactionDAO';
import { IQueue } from './IQueue';
import { INetworkService } from './INetworkService';
import { NotifyTransactionListenerParamsType, TransactionListenerNotifyReturnType, TransactionMessageType } from '../types';

export interface ITransactionListener<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionDao: ITransactionDAO;
  transactionQueue: IQueue<TransactionMessageType>;
  retryTransactionQueue: IQueue<TransactionMessageType>;

  notify(notifyTransactionListenerParams: NotifyTransactionListenerParamsType):
  Promise<TransactionListenerNotifyReturnType>
}
