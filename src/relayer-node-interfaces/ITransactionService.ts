import { ErrorTransactionResponseType, ExecuteTransactionParamsType, ExecuteTransactionResponseType, RetryTransactionDataType, SuccessTransactionResponseType, TransactionDataType, TransactionType } from '../types';
import { IEVMAccount } from './IEVMAccount';
import { INetworkService } from './INetworkService';

export interface ITransactionService<AccountType, RawTransactionType> {
  executeTransaction(
    executeTransactionParams: ExecuteTransactionParamsType,
  ): Promise<ExecuteTransactionResponseType>;

  sendTransaction(
    transaction: TransactionDataType,
    account: AccountType,
    transactionType: TransactionType,
    relayerManagerName: string,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
  retryTransaction(
    transaction: RetryTransactionDataType,
    account: IEVMAccount,
    tranasctionType: TransactionType,
    relayerManagerName: string,
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;

  getNetworkServiceInstance(): INetworkService<AccountType, RawTransactionType>;
}
