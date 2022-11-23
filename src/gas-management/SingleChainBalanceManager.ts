// import "{ } from "./types";
import { BigNumber, ethers } from 'ethers';
import { config } from '../config';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { ITokenPrice } from '../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../relayer-node-interfaces/ITransactionService';
import { EVMRawTransactionType, BalanceManagerParams, MasterFundingAccount, TokenData } from '../types';
import { IBalanceManager } from './interfaces/IBalanceManager';
import { BalanceManager } from './BalanceManager';

export class SingleChainBalanceManager extends BalanceManager implements IBalanceManager {
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  masterFundingAccount: IEVMAccount;
  tokenList: Record<number, TokenData[]>;
  tokenPriceService: ITokenPrice;

  constructor(balanceManagerParams: BalanceManagerParams) {
    super(balanceManagerParams.masterFundingAccount, balanceManagerParams.transactionServiceMap);
    this.transactionServiceMap = balanceManagerParams.transactionServiceMap;
    this.masterFundingAccount = balanceManagerParams.masterFundingAccount;
    this.tokenList = balanceManagerParams.tokenList;
    this.tokenPriceService = balanceManagerParams.tokenPriceService;
  }
}