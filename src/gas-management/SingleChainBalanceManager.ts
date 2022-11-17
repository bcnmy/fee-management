// import "{ } from "./types";
import { BigNumber, ethers } from 'ethers';
import { config } from '../config';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { ITokenPrice } from '../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../relayer-node-interfaces/ITransactionService';
import { EVMRawTransactionType, BalanceManagerParams, MasterFundingAccount, TokenData } from '../types';
import { IBalanceManager } from './interfaces/IBalanceManager';
import { log } from '../logs';
import { stringify } from '../utils/common-utils';

export class SingleChainBalanceManager implements IBalanceManager {
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
    let mfaPublicKey = this.masterFundingAccount.getPublicKey();
    try {
      log.info(`tokenAddress: ${tokenAddress}`);
      if (tokenAddress === config.NATIVE_ADDRESS_RELAYER || tokenAddress === config.NATIVE_ADDRESS_ROUTER) {
        tokenBalance = await this.transactionServiceMap[chainId].networkService.getBalance(
          mfaPublicKey
        );

      } else {
        let tokenBalanceFromChain = await this.transactionServiceMap[chainId].networkService.executeReadMethod(
          config.erc20Abi,
          tokenAddress,
          'balanceOf',
          [mfaPublicKey]
        );

        tokenBalance = ethers.BigNumber.from(tokenBalanceFromChain);
      }

      log.info(`MFA ${mfaPublicKey} balance for token ${tokenAddress} is: ${tokenBalance.toString()}`);
    } catch (error: any) {
      log.error(stringify(error.message ? error.message : error));
      throw new Error(`Error while fetching MFA ${mfaPublicKey} balance for token ${tokenAddress} on chain ${chainId}: ${stringify(error)}`);
    }

    return tokenBalance;
  }

  calculateMFABalanceInUSD(): Promise<Record<number, number>> {
    throw new Error('Method not implemented.');
  }
}