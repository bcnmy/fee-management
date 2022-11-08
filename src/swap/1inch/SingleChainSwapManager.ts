import { config } from '../../config';
import { ISwapManager } from '../interfaces/ISwapManager';
import { EVMRawTransactionType, PathParams, QuoteRequestParam, SwapCostParams, SwapParams, TokenData, TransactionType } from "../../types";
import { log } from '../../logs';
import { stringify } from '../../utils/common-utils';
import { ethers } from 'ethers';
import { ITokenPrice } from '../../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../../relayer-node-interfaces/ITransactionService';
import { IBalanceManager } from '../../gas-management/interfaces/IBalanceManager';
import { IEVMAccount } from '../../relayer-node-interfaces/IEVMAccount';

const fetch = require('node-fetch');

export class SingleChainSwapManager implements ISwapManager {
  // TODO add try catch
  oneIncheTokenMap: Record<number, Record<string, string>> = {};
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
  tokenList: Record<number, TokenData[]>;
  balanceThreshold: Record<number, number>;
  masterFundingAccount: IEVMAccount;
  label: string;

  constructor(swapParams: SwapParams) {
    this.tokenPriceService = swapParams.tokenPriceService;
    this.transactionServiceMap = swapParams.transactionServiceMap;
    this.balanceManager = swapParams.balanceManager;
    this.tokenList = swapParams.tokenList;
    this.balanceThreshold = swapParams.balanceThreshold;
    this.masterFundingAccount = swapParams.masterFundingAccount;
    this.label = swapParams.label ? swapParams.label : "SingleChainAccountsManager"
  }

  getSwapTokenList(chainId: number): Record<string, string> {
    return this.oneIncheTokenMap[chainId];
  }

  async initialiseSwapTokenList(chainId: number): Promise<void> {
    try {
      log.info(`getSupportedTokenList() chainId: ${chainId} `);
      const supportedTokenurl = this.apiRequestUrl('/tokens', chainId, null);

      log.info(`supportedTokenurl: ${supportedTokenurl} `);
      const response = await fetch(supportedTokenurl)
        .then((res: any) => res.json())
        .then((res: any) => res);
      log.info(`getSupportedTokenList() response: ${stringify(response)} `);

      let tokenList: Record<string, string> = {};
      for (let tokenAddress in response.tokens) {
        let symbol = response.tokens[tokenAddress].symbol;
        tokenList[symbol] = tokenAddress;
      }

      log.info(`tokenList: ${stringify(tokenList)} `);
      this.oneIncheTokenMap[chainId] = response.tokenList
      // return response.tokenList;
    }
    catch (error: any) {
      throw new Error(error);
    }
  }

  async initiateSwap(chainId: number): Promise<unknown> {
    let usdBalanceOfMFA: Record<number, number> = {};

    //TODO: Sachin: To be done later as optimisation: Use Promise.all to parallely calculate token balances https://www.geeksforgeeks.org/javascript-promise-all-method/
    try {
      let swapHashMap: Record<string, Record<string, string>> = {};
      for (let tokenRecordIndex = 0; tokenRecordIndex < this.tokenList[chainId].length; tokenRecordIndex++) {
        let tokenAddress = this.tokenList[chainId][tokenRecordIndex].address.toLowerCase();
        let tokenDecimal = this.tokenList[chainId][tokenRecordIndex].decimal;
        if (tokenAddress !== config.NATIVE_ADDRESS) {
          try {
            let tokenBalance = await this.balanceManager.getBalance(
              Number(chainId),
              tokenAddress
            );

            let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(
              this.tokenList[chainId][tokenRecordIndex].symbol
            );
            // TODO: Sachin: Divide this by token decimals - done
            let balanceValueInUsd = tokenBalance.mul(tokenUsdPrice).div(ethers.BigNumber.from(10).pow(tokenDecimal));
            if (balanceValueInUsd.gt(this.balanceThreshold[chainId])) {
              let dexAllowance = await this.checkDexAllowane(chainId, tokenAddress);
              if (dexAllowance.lt(tokenBalance)) {
                let approveRequest = await this.approveSpender(chainId, config.INFINITE_APPROVAL_AMOUNT, tokenAddress);
                let approveReceipt = await this.transactionServiceMap[chainId].networkService.ethersProvider.waitForTransaction(approveRequest.hash);
                if (!approveReceipt || approveReceipt.status === 0) {
                  log.error(`Approval Failed`);
                  break;
                }

                swapHashMap[tokenAddress] = {
                  "approveHash": approveReceipt.transactionHash
                }
              }

              let swapRequest = await this.swapToken(chainId, tokenBalance, tokenAddress);
              let swapReceipt = await this.transactionServiceMap[chainId].networkService.ethersProvider.waitForTransaction(swapRequest.hash);

              if (swapHashMap != undefined) {
                swapHashMap[tokenAddress] = {
                  "swapHash": swapReceipt.transactionHash
                }
              }
            } else {
              log.info(`Current token Balance < threshold, no need to swap`);
            }
          } catch (error: any) {
            log.error(`Error calculating token usdBalance in MFA for chainId ${chainId} & 
            tokenAddress: ${tokenAddress}: ${stringify(error)}`);
          }
        }
      }
    } catch (error: any) {
      log.error(`error: ${stringify(error)}`);
      throw new Error(`Error while calculating usdBalance in MFA ${stringify(error)}`);
    }

    log.info(`usdBalanceOfMFA : ${stringify(usdBalanceOfMFA)}`);
    return;
  }

  async swapToken(chainId: number, amount: any, tokenAddress: string): Promise<ethers.providers.TransactionResponse> {
    const swapParams = {
      fromTokenAddress: tokenAddress,
      toTokenAddress: config.NATIVE_ADDRESS,
      amount,
      fromAddress: this.masterFundingAccount.getPublicKey(),
      slippage: 1,
      disableEstimate: false,
      allowPartialFill: false,
    };

    const url = this.apiRequestUrl('/swap', chainId, swapParams);

    const rawTransaction = fetch(url).then((res: any) => res.json()).then((res: any) => res.tx);

    let swapResponse = await this.transactionServiceMap[chainId].sendTransaction(rawTransaction, this.masterFundingAccount,
      TransactionType.SCW, this.label);

    if (swapResponse.code === 200 && swapResponse.transactionExecutionResponse) {
      return swapResponse.transactionExecutionResponse
    }
    throw new Error(`Failed to swap token ${tokenAddress} on chainId: ${chainId} for amount ${amount}`);
  }

  async approveSpender(chainId: number, amount: string, tokenAddress: string): Promise<ethers.providers.TransactionResponse> {
    const url = this.apiRequestUrl('/approve/transaction', chainId, { tokenAddress, amount });

    const transaction = await fetch(url).then((res: any) => res.json());

    const gasLimit = await this.transactionServiceMap[chainId].networkService.ethersProvider.estimateGas({
      ...transaction,
      from: this.masterFundingAccount.getPublicKey()
    });

    const rawTransaction = {
      ...transaction,
      gas: gasLimit
    }

    let approveResponse = await this.transactionServiceMap[chainId].sendTransaction(rawTransaction, this.masterFundingAccount,
      TransactionType.SCW, this.label);
    if (approveResponse.code === 200 && approveResponse.transactionExecutionResponse) {
      return approveResponse.transactionExecutionResponse
    }
    throw new Error(`Failed to approve token ${tokenAddress} on chainId: ${chainId} for amount ${amount}`);
  }

  async checkDexAllowane(chainId: number, tokenAddress: string) {
    return fetch(this.apiRequestUrl('/approve/allowance', chainId, { tokenAddress, walletAddress: this.masterFundingAccount.getPublicKey() }))
      .then((res: any) => res.json())
      .then((res: any) => res.allowance);
  }

  apiRequestUrl(methodName: string, chainId: number, queryParams: any): string {
    return config.oneInchApiBaseUrl + chainId + methodName + '?' + new URLSearchParams(queryParams).toString();
  }

  getSwapCost(swapCostParams: SwapCostParams): Promise<ethers.BigNumber> {
    throw new Error('Method not implemented.');
  }
  getQuote(quoteRequestParam: QuoteRequestParam) {
    throw new Error('Method not implemented.');
  }
}
