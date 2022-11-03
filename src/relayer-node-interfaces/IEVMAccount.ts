import { EVMRawTransactionType } from '../types';
import { IAccount } from './IAccount';

export interface IEVMAccount extends IAccount {
  signMessage(message: string): Promise<string>;
  signTransaction(rawTransaction: EVMRawTransactionType): Promise<string>
}