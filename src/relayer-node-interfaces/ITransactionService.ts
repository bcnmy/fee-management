import { ErrorTransactionResponseType, ExecuteTransactionParamsType, ExecuteTransactionResponseType, RetryTransactionDataType, SuccessTransactionResponseType, TransactionDataType, TransactionType } from '../types';
import { ICacheService } from './ICacheService';
import { IEVMAccount } from './IEVMAccount';
import { IGasPrice } from './IGasPrice';
import { INetworkService } from './INetworkService';
import { INonceManager } from './INonceManager';
import { ITransactionListener } from './ITransactionListener';
export interface ITransactionService<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionListener: ITransactionListener<AccountType, RawTransactionType>;
  nonceManager: INonceManager<AccountType, RawTransactionType>;
  gasPriceService: IGasPrice;
  cacheService: ICacheService

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
}
