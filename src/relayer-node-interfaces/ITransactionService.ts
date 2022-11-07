import { ErrorTransactionResponseType, RetryTransactionDataType, SuccessTransactionResponseType, TransactionDataType, TransactionType } from '../types';
import { IEVMAccount } from './IEVMAccount';
import { INetworkService } from './INetworkService';
export interface ITransactionService<AccountType, RawTransactionType> {

  networkService: INetworkService<AccountType, RawTransactionType>;

  sendTransaction(
    transaction: TransactionDataType,
    account: AccountType,
    tranasctionType: TransactionType,
    relayerManagerName: string,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
  retryTransaction(
    transaction: RetryTransactionDataType,
    account: IEVMAccount,
    tranasctionType: TransactionType,
    relayerManagerName: string,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
}
