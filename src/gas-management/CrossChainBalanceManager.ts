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
export class CrossChainBalanceManager implements IBalanceManager {
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
      if (tokenAddress === config.NATIVE_ADDRESS) {
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

  //TODO: Sachin: Add method comments here, that it calculates total usd balance of all tokens on each supported chains.
  async calculateMFABalanceInUSD(): Promise<Record<number, number>> {
    let usdBalanceOfMFA: Record<number, number> = {};

    //TODO: Sachin: To be done later as optimisation: Use Promise.all to parallely calculate token balances https://www.geeksforgeeks.org/javascript-promise-all-method/
    try {
      for (let chainId in this.tokenList) {
        for (let tokenRecordIndex = 0; tokenRecordIndex < this.tokenList[chainId].length; tokenRecordIndex++) {
          try {
            let tokenBalance = await this.getBalance(
              Number(chainId),
              this.tokenList[chainId][tokenRecordIndex].address.toLowerCase()
            );

            let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(
              this.tokenList[chainId][tokenRecordIndex].symbol
            );
            let balanceValueInUsd = tokenBalance.mul(tokenUsdPrice).div(ethers.BigNumber.from(10).pow(this.tokenList[chainId][tokenRecordIndex].decimal));

            usdBalanceOfMFA[chainId] = +balanceValueInUsd;
          } catch (error: any) {
            log.error(`Error while calculating token usdBalance in MFA for chainId ${chainId}: ${stringify(error)}`);
            throw new Error(`Error while calculating token usdBalance in MFA for chainId ${chainId}: ${stringify(error)}`);
          }
        }
      }
    } catch (error: any) {
      log.error(`error: ${stringify(error)}`);
      throw new Error(`Error while calculating usdBalance in MFA ${stringify(error)}`);
    }

    log.info(`usdBalanceOfMFA : ${stringify(usdBalanceOfMFA)}`);
    return usdBalanceOfMFA;
  }
}
