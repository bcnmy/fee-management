import { config } from '../../config';
import { ISwapManager } from '../interfaces/ISwapManager';
import { AppConfig, EVMRawTransactionType, GasPriceType, QuoteRequestParam, RawTransactionParam, SwapCostParams, SwapParams, TransactionType } from "../../types";
import { log } from '../../logs';
import { generateTransactionId, stringify } from '../../utils/common-utils';
import { BigNumber, ethers } from 'ethers';
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
  appConfig: AppConfig;
  balanceThreshold: Record<number, Record<string, number>>;
  masterFundingAccount: IEVMAccount;
  label: string;

  constructor(swapParams: SwapParams) {
    this.appConfig = swapParams.appConfig;
    this.tokenPriceService = swapParams.tokenPriceService;
    this.transactionServiceMap = swapParams.transactionServiceMap;
    this.balanceManager = swapParams.balanceManager;
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

      let tokenList: Record<string, string> = {};
      for (let tokenAddress in response.tokens) {
        let symbol = response.tokens[tokenAddress].symbol;
        tokenList[symbol] = tokenAddress;
      }
      this.oneIncheTokenMap[chainId] = response.tokenList
    }
    catch (error: any) {
      throw new Error(error);
    }
  }

  async initiateSwap(chainId: number): Promise<unknown> {
    let usdBalanceOfMFA: Record<number, number> = {};

    log.info("Initiate Swap");

    //TODO: Sachin: To be done later as optimisation: Use Promise.all to parallely calculate token balances https://www.geeksforgeeks.org/javascript-promise-all-method/
    try {
      let swapHashMap: Record<string, Record<string, string>> = {};
      for (let tokenRecordIndex = 0; tokenRecordIndex < this.appConfig.tokenList[chainId].length; tokenRecordIndex++) {
        let tokenAddress = this.appConfig.tokenList[chainId][tokenRecordIndex].address.toLowerCase();
        let tokenDecimal = this.appConfig.tokenList[chainId][tokenRecordIndex].decimal;
        if (tokenAddress !== config.NATIVE_ADDRESS_RELAYER && tokenAddress !== config.NATIVE_ADDRESS_ROUTER) {
          try {
            let tokenBalance = await this.balanceManager.getBalance(
              Number(chainId),
              tokenAddress
            );

            let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(
              this.appConfig.tokenList[chainId][tokenRecordIndex].symbol
            );
            // TODO: Sachin: Divide this by token decimals - done
            let balanceValueInUsd = tokenBalance.mul(tokenUsdPrice).div(ethers.BigNumber.from(10).pow(tokenDecimal));
            if (balanceValueInUsd.gt(this.balanceThreshold[chainId][tokenAddress])) {

              let dexAllowance = await this.checkDexAllowane(chainId, tokenAddress);
              if (tokenBalance.gt(dexAllowance.toString())) {
                let approveRequest = await this.approveSpender(chainId, config.INFINITE_APPROVAL_AMOUNT, tokenAddress);
                let approveReceipt = await this.transactionServiceMap[chainId].networkService.ethersProvider.waitForTransaction(
                  approveRequest.hash,
                  this.appConfig.noOfDepositConfirmation[chainId],
                  60000
                );
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
            tokenAddress: ${tokenAddress}`);
            log.error(error);
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
    let mfaPrivateKey = this.masterFundingAccount.getPublicKey();
    const swapParams = {
      fromTokenAddress: tokenAddress,
      toTokenAddress: config.NATIVE_ADDRESS_ROUTER,
      amount,
      fromAddress: this.masterFundingAccount.getPublicKey(),
      slippage: 1,
      disableEstimate: false,
      allowPartialFill: false,
    };

    const url = this.apiRequestUrl('/swap', chainId, swapParams);
    const rawTransaction: RawTransactionParam = await fetch(url).then((res: any) => res.json()).then((res: any) => res.tx);
    rawTransaction.value = BigNumber.from(rawTransaction.value)._hex;
    rawTransaction.gasLimit = rawTransaction.gas;

    let transactionId = await generateTransactionId(JSON.stringify(rawTransaction));
    log.info(`swapToken() ~ ~ rawTransaction: ${rawTransaction} , transactionId : ${transactionId}`);

    let swapResponse = await this.transactionServiceMap[chainId].sendTransaction(
      {
        ...rawTransaction,
        transactionId,
        walletAddress: mfaPrivateKey,
        speed: GasPriceType.FAST
      },
      this.masterFundingAccount,
      TransactionType.SCW,
      this.label
    );

    if (swapResponse.code === 200 && swapResponse.transactionExecutionResponse) {
      return swapResponse.transactionExecutionResponse
    }
    throw new Error(`Failed to swap token ${tokenAddress} on chainId: ${chainId} for amount ${amount}`);
  }

  async approveSpender(chainId: number, amount: string, tokenAddress: string): Promise<ethers.providers.TransactionResponse> {

    let mfaPrivateKey = this.masterFundingAccount.getPublicKey()
    const url = this.apiRequestUrl('/approve/transaction', chainId, { tokenAddress, amount });

    const transaction = await fetch(url).then((res: any) => res.json());

    const gasLimit = await this.transactionServiceMap[chainId].networkService.ethersProvider.estimateGas({
      ...transaction,
      from: this.masterFundingAccount.getPublicKey()
    });

    const rawTransaction: RawTransactionParam = {
      ...transaction,
      value: BigNumber.from(transaction.value)._hex,
      gasLimit: gasLimit,
      from: mfaPrivateKey,
      chainId: chainId,
    }

    let transactionId = await generateTransactionId(JSON.stringify(rawTransaction));
    log.info(`transactionId : ${transactionId}`);

    let approveResponse = await this.transactionServiceMap[chainId].sendTransaction(
      {
        ...rawTransaction,
        transactionId,
        walletAddress: mfaPrivateKey,
        speed: GasPriceType.FAST
      },
      this.masterFundingAccount,
      TransactionType.SCW,
      this.label
    );

    if (approveResponse.code === 200 && approveResponse.transactionExecutionResponse) {
      return approveResponse.transactionExecutionResponse
    }
    throw new Error(`Failed to approve token ${tokenAddress} on chainId: ${chainId} for amount ${amount}`);
  }

  async checkDexAllowane(chainId: number, tokenAddress: string): Promise<BigNumber> {
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
