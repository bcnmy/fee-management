// import "{ } from "./types";
import { BigNumber, ethers } from 'ethers';
import { config, NATIVE_ADDRESS } from '../config';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { ITokenPrice } from '../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../relayer-node-interfaces/ITransactionService';
import { EVMRawTransactionType, BalanceManagerParams, MasterFundingAccount, TokenData } from '../types';
import { IBalanceManager } from './interfaces/IBalanceManager';
import { log } from '../logs';
import { stringify } from '../utils/common-utils';

export class UniChainBalanceManager implements IBalanceManager {
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  masterFundingAccount: IEVMAccount;
  tokenList: Record<number, TokenData[]>;
  tokenPriceService: ITokenPrice;

  constructor(balanceManagerParams: BalanceManagerParams) {
    this.transactionServiceMap = balanceManagerParams.transactionServiceMap;
    this.masterFundingAccount = balanceManagerParams.masterFundingAccount;
    this.tokenList = balanceManagerParams.tokenList;
    this.tokenPriceService = balanceManagerParams.tokenPriceService;
  }

  async getBalance(chainId: number, tokenAddress: string): Promise<BigNumber> {
    let tokenBalance: BigNumber;
    try {
      log.info(`tokenAddress: ${tokenAddress}`);
      if (tokenAddress === NATIVE_ADDRESS) {
        tokenBalance = await this.transactionServiceMap[chainId].networkService.getBalance(
          this.masterFundingAccount.getPublicKey()
        );

      } else {
        let tokenBalanceFromChain = await this.transactionServiceMap[chainId].networkService.executeReadMethod(
          config.erc20Abi,
          tokenAddress,
          'balanceOf',
          [this.masterFundingAccount.getPublicKey()]
        );

        tokenBalance = ethers.BigNumber.from(tokenBalanceFromChain);
      }

      log.info(`tokenBalance: ${tokenBalance.toString()}`);
    } catch (error: any) {
      log.error(`error : ${stringify(error)}`);
      throw new Error(`Error while fetching token ${tokenAddress} balance on chain ${chainId}: ${stringify(error)}`);
    }

    return tokenBalance;
  }

  calculateMFABalanceInUSD(): Promise<Record<number, number>> {
    throw new Error('Method not implemented.');
  }
}