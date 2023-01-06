import { ethers } from 'ethers';
import { ITokenPrice } from '../relayer-node-interfaces/ITokenPrice';
import { BalanceManagerParams, TokenData } from '../types';
import { IBalanceManager } from './interfaces/IBalanceManager';
import { log } from '../logs';
import { stringify } from '../utils/common-utils';
import { BalanceManager } from './BalanceManager';
export class CrossChainBalanceManager extends BalanceManager implements IBalanceManager {
  tokenList: Record<number, TokenData[]>;
  tokenPriceService: ITokenPrice;

  constructor(balanceManagerParams: BalanceManagerParams) {
    super(balanceManagerParams.masterFundingAccount, balanceManagerParams.transactionServiceMap);
    this.tokenList = balanceManagerParams.tokenList;
    this.tokenPriceService = balanceManagerParams.tokenPriceService;
  }

  /*** @description: to rebalance across multiple chains, first calculate 
   * all available funds's USD value in Master Account on each chain
   */
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
