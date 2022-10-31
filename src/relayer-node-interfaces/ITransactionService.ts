import { IGasPrice } from './IGasPrice';
import { INetworkService } from './INetworkService';
import { INonceManager } from './INonceManager';
import { ITransactionListener } from './ITransactionListener';
import { ErrorTransactionResponseType, SuccessTransactionResponseType, TransactionDataType } from '../types';

export interface ITransactionService<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  transactionListener: ITransactionListener<AccountType, RawTransactionType>;
  nonceManager: INonceManager<AccountType, RawTransactionType>;
  gasPriceService: IGasPrice;

  sendTransaction(
    transaction: TransactionDataType,
    account: AccountType
  ): Promise<SuccessTransactionResponseType | ErrorTransactionResponseType>;
}
