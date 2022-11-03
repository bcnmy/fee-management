// import "{ } from "./types";
import { BigNumber, ethers } from "ethers";
import { config, NATIVE_ADDRESS } from "../config";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { ITokenPrice } from "../relayer-node-interfaces/ITokenPrice";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { EVMRawTransactionType, BalanceManagerParams, MasterFundingAccount, TokenData } from "../types";
import { IBalanceManager } from "./interfaces/IBalanceManager";

class BalanceManager implements IBalanceManager {
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  masterFundingAccount: MasterFundingAccount;
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
      if (tokenAddress === NATIVE_ADDRESS) {
        tokenBalance = await this.transactionServiceMap[chainId].networkService.getBalance(
          this.masterFundingAccount.publicAddress
        );
      } else {
        let readBalanceFromChain = await this.transactionServiceMap[chainId].networkService.executeReadMethod(
          config.erc20Abi,
          tokenAddress,
          "balanceOf",
          [this.masterFundingAccount.publicAddress]
        );

        tokenBalance = ethers.BigNumber.from(readBalanceFromChain);
      }
    } catch (error) {
      throw new Error(`Error while fetching token ${tokenAddress} balance on chain ${chainId}`);
    }

    return tokenBalance;
  }

  //TODO: Sachin: Add method comments here, that it calculates total usd balance of all tokens on each supported chains.
  async calculateMFABalanceInUSD(): Promise<Map<number, number>> {
    let usdBalanceOfMFA: Map<number, number> = new Map();

    try {
      for (let chainId in this.tokenList) {
        for (let tokenRecordIndex = 0; tokenRecordIndex < this.tokenList[chainId].length; tokenRecordIndex++) {
          try {
            console.log(this.tokenList[chainId][tokenRecordIndex].address);
            let tokenBalance = await this.getBalance(
              Number(chainId),
              this.tokenList[chainId][tokenRecordIndex].address.toLowerCase()
            );

            let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(
              this.tokenList[chainId][tokenRecordIndex].symbol
            );
            let balanceValueInUsd = tokenBalance.mul(tokenUsdPrice);

            usdBalanceOfMFA[chainId] = +balanceValueInUsd;
          } catch (error) {
            throw new Error(`Error while calculating token usdBalance in MFA for chainId ${chainId}`);
          }
        }
      }
    } catch (error) {
      throw new Error(`Error while calculating usdBalance in MFA ${JSON.stringify(error)}`);
    }
    return usdBalanceOfMFA;
  }
}

export { BalanceManager };
