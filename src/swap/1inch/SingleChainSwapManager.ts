import { config } from '../../config';
import { ISwapManager } from '../interfaces/ISwapManager';
import { AppConfig, EVMRawTransactionType, GasPriceType, QuoteRequestParam, RawTransactionParam, RouteParams, SwapCostParams, SwapParams, TransactionType } from "../../types";
import { log } from '../../logs';
import { generateTransactionId, stringify } from '../../utils/common-utils';
import { BigNumber, ethers } from 'ethers';
import { ITokenPrice } from '../../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../../relayer-node-interfaces/ITransactionService';
import { IBalanceManager } from '../../gas-management/interfaces/IBalanceManager';
import { IEVMAccount } from '../../relayer-node-interfaces/IEVMAccount';
import { OneInchManager } from './OneInchManager';
import { ICacheService } from '../../relayer-node-interfaces/ICacheService';
import { hexValue } from 'ethers/lib/utils';

const fetch = require('node-fetch');

export class SingleChainSwapManager extends OneInchManager implements ISwapManager {
  // TODO add try catch
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
  appConfig: AppConfig;
  balanceThreshold: Record<number, Record<string, number>>;
  masterFundingAccount: IEVMAccount;
  label: string;
  cacheService: ICacheService;

  constructor(swapParams: SwapParams) {
    super(swapParams.masterFundingAccount, swapParams.transactionServiceMap, swapParams.cacheService)
    this.cacheService = swapParams.cacheService;
    this.appConfig = swapParams.appConfig;
    this.tokenPriceService = swapParams.tokenPriceService;
    this.transactionServiceMap = swapParams.transactionServiceMap;
    this.balanceManager = swapParams.balanceManager;
    this.balanceThreshold = this.appConfig.balanceThreshold;
    this.masterFundingAccount = swapParams.masterFundingAccount;
    this.label = swapParams.label ? swapParams.label : "SingleChainAccountsManager"
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

            let balanceValueInUsd = tokenBalance.mul(tokenUsdPrice).div(ethers.BigNumber.from(10).pow(tokenDecimal));
            if (!this.balanceThreshold[chainId][tokenAddress]) {
              log.info(`balanceThreshold is not defined for ${tokenAddress} on chain ${chainId}`)
            } else if (balanceValueInUsd.gt(this.balanceThreshold[chainId][tokenAddress])) {

              let dexAllowance;
              try {
                dexAllowance = await this.checkDexAllowance(chainId, tokenAddress);
              } catch (error: any) {
                log.error(error);
                break;
              }

              if (dexAllowance && tokenBalance.gt(dexAllowance.toString())) {
                let approveRequest;
                try {
                  approveRequest = await this.approveSpender(chainId, config.INFINITE_APPROVAL_AMOUNT, tokenAddress);
                } catch (error: any) {
                  log.error(error);
                  break;
                }

                let approveReceipt = await this.transactionServiceMap[chainId].networkService.waitForTransaction(
                  approveRequest.hash,
                  this.appConfig.noOfBlockConfirmation[chainId]
                );
                if (!approveReceipt || approveReceipt.status === 0) {
                  log.error(`Approval Failed for token ${tokenAddress} on chain ${chainId}`);
                  break;
                }

                swapHashMap[tokenAddress] = {
                  "approveHash": approveReceipt.transactionHash
                }
              }

              let swapRequest;
              try {
                swapRequest = await this.swapToNative(chainId, tokenBalance.toString(), tokenAddress);
              } catch (error: any) {
                log.error(error);
                break;
              }

              let swapReceipt = await this.transactionServiceMap[chainId].networkService.waitForTransaction(
                swapRequest.hash,
                this.appConfig.noOfBlockConfirmation[chainId]
              );

              if (!swapReceipt || swapReceipt.status === 0) {
                log.error(`Failed to get SwapReceipt for token ${tokenAddress} on chain ${chainId} with hash: swapRequest.hash`);
                break;
              }
              if (swapHashMap[tokenAddress] != undefined) {
                swapHashMap[tokenAddress]["swapHash"] = swapReceipt.transactionHash;
              } else {
                swapHashMap[tokenAddress] =
                {
                  "swapHash": swapReceipt.transactionHash
                }
              }
            } else {
              log.info(`Current token Balance < threshold, no need to swap`);
            }
          } catch (error: any) {
            log.error(`Error calculating token usdBalance in MFA for chainId ${chainId} & tokenAddress: ${tokenAddress}`);
            log.error(error);
          }
        } else {
          log.info(`No need to convert Native Token on chain ${chainId}`)
        }
      }
      log.info(`usdBalanceOfMFA : ${stringify(usdBalanceOfMFA)}`);
      return {
        code: config.RESPONSE_CODES.SUCCESS,
        message: 'Converted all tokens successfully',
        swapHashMap: swapHashMap,
      }
    } catch (error: any) {
      log.error(error);
      throw error;
    }
  }

  async swapToNative(chainId: number, amount: string, tokenAddress: string): Promise<ethers.providers.TransactionResponse> {
    try {
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
      if (!(rawTransaction && rawTransaction.value && rawTransaction.gas)) {
        throw new Error(`rawTransaction or rawTransaction.value or rawTransaction.gas is missing`);
      }

      rawTransaction.value = BigNumber.from(rawTransaction.value)._hex;
      rawTransaction.gasLimit = hexValue(rawTransaction.gas);

      let transactionId = await generateTransactionId(JSON.stringify(rawTransaction));
      log.info(`swapToNative() ~ ~ rawTransaction: ${rawTransaction} , transactionId : ${transactionId}`);

      let swapResponse = await this.transactionServiceMap[chainId].sendTransaction(
        {
          ...rawTransaction,
          transactionId,
          walletAddress: mfaPrivateKey,
          speed: GasPriceType.FAST
        },
        this.masterFundingAccount,
        TransactionType.FUNDING,
        this.label
      );

      if (swapResponse.code === 200 && swapResponse.transactionExecutionResponse) {
        return swapResponse.transactionExecutionResponse
      }
      throw new Error(`Failed to swap token ${tokenAddress} on chainId: ${chainId} for amount ${amount}`);
    } catch (error: any) {
      log.error(error);
      throw error;
    }
  }

  async approveSpender(chainId: number, amount: BigNumber, tokenAddress: string): Promise<ethers.providers.TransactionResponse> {
    return super.approveSpender(chainId, amount, tokenAddress, this.label);
  }

  swapToken(route: RouteParams): Promise<ethers.providers.TransactionResponse> {
    throw new Error('Method not implemented.');
  }

  initialiseSwapTokenList(chainId: number): void {
    throw new Error('Method not implemented.');
  }
  getSwapTokenList(chainId: number): Record<string, string> {
    throw new Error('Method not implemented.');
  }
}
