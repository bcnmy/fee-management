import { ethers } from 'ethers';
import { INetwork } from '../blockchain/interface/INetwork';
import { config } from '../config';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { ITokenPrice } from '../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../relayer-node-interfaces/ITransactionService';
import { BridgeParams, EVMRawTransactionType, ExitParams, HyphenDepositParams } from '../types';
import { IBridgeService } from './interfaces/IBridgeService';
import { log } from '../logs';
import { stringify } from '../utils/common-utils';
const fetch = require('node-fetch');

class HyphenBridge implements IBridgeService {
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  networkMap: Record<number, INetwork>;
  tokenPriceService: ITokenPrice;
  masterFundingAccount: IEVMAccount;

  constructor(bridgeParams: BridgeParams) {
    this.transactionServiceMap = bridgeParams.transactionServiceMap;
    this.networkMap = bridgeParams.networkMap;
    this.tokenPriceService = bridgeParams.tokenPriceService;
    this.masterFundingAccount = bridgeParams.masterFundingAccount;
  }

  apiRequestUrl(methodName: string, queryParams: any): string {
    return config.hyphenBaseUrl + methodName + '?' + new URLSearchParams(queryParams).toString();
  }
  async getHyphenSupportedToken(chainId: number): Promise<Record<string, Record<number, string>>> {
    try {
      const supportedTokenurl = this.apiRequestUrl(config.hyphenSupportedTokenEndpoint, {
        networkId: chainId,
      });
      log.info(`supportedTokenurl : ${supportedTokenurl}`);
      const hyphenSupportedTokenResponse: any = await fetch(supportedTokenurl)
        .then((res: any) => res.json())
        .then((res: any) => res);

      log.info(`hyphenSupportedTokenResponse : ${stringify(hyphenSupportedTokenResponse)}`);
      let tokens: Record<string, Record<number, string>> = {};
      for (let index = 0; index < hyphenSupportedTokenResponse.supportedPairList.length; index++) {
        let tokenPair = hyphenSupportedTokenResponse.supportedPairList[index];
        if (tokens[tokenPair.address] == undefined) {
          tokens[tokenPair.address] = {
            [tokenPair.toChainId]: tokenPair.toChainToken,
          };
        } else {
          tokens[tokenPair.address][tokenPair.toChainId] = tokenPair.toChainToken;
        }
      }

      log.info(`tokens : ${stringify(tokens)}`);
      return tokens;
    } catch (error: any) {
      log.error(`error : ${stringify(error)}`);
      throw new Error(error);
    }
  }

  async getExitCost(exitParams: ExitParams): Promise<number> {
    try {
      const transferFeeUrl = this.apiRequestUrl(config.hyphenTransferFeeEndpoint, {
        fromChainId: exitParams.fromChainId,
        toChainId: exitParams.toChainId,
        tokenAddress: exitParams.tokenAddress,
        amount: exitParams.transferAmount,
      });
      log.info(`transferFeeUrl : ${transferFeeUrl}`);
      const exitCostResponnse: any = await fetch(transferFeeUrl)
        .then((res: any) => res.json())
        .then((res: any) => res);

      log.info(`exitCostResponnse : ${stringify(exitCostResponnse)}`);
      return exitCostResponnse.netTransferFee;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  async getDepositCost(depositParams: HyphenDepositParams): Promise<ethers.BigNumber> {
    try {
      const hyphenContract: ethers.Contract = this.networkMap[depositParams.fromChainId].getLiquidityPoolInstance();
      let rawDepositTransaction;
      let value = ethers.utils.parseEther('0');

      if (depositParams.tokenAddress.toLowerCase() === config.NATIVE_ADDRESS) {
        log.info(`Get depositNative rawDepositTransaction`);
        rawDepositTransaction = await hyphenContract.populateTransaction.depositNative(
          depositParams.receiver,
          depositParams.toChainId,
          depositParams.tag
        );
        value = ethers.utils.parseEther(depositParams.amount.toString());
      } else {
        log.info(`Get depositErc20 rawDepositTransaction`);
        rawDepositTransaction = await hyphenContract.populateTransaction.depositErc20(
          depositParams.toChainId,
          depositParams.tokenAddress,
          depositParams.receiver,
          depositParams.amount,
          depositParams.tag
        );
      }
      log.info(` rawDepositTransaction: ${rawDepositTransaction}`);

      const depositGasSpend = await this.transactionServiceMap[
        depositParams.fromChainId
      ].networkService.ethersProvider.estimateGas({
        from: this.masterFundingAccount.getPublicKey(),
        to: config.hyphenLiquidityPoolAddress[depositParams.fromChainId],
        data: rawDepositTransaction.data,
        value: value,
      });
      log.info(`depositGasSpend: ${depositGasSpend}`);

      let networkGasPrice = await this.transactionServiceMap[depositParams.fromChainId].networkService.getGasPrice();
      log.info(`networkGasPrice: ${networkGasPrice.gasPrice}`);

      let depositCostInNativeCurrency = depositGasSpend.mul(networkGasPrice.gasPrice);
      log.info(`depositCostInNativeCurrency: ${depositCostInNativeCurrency} `);

      let tokenPriceInUsd = await this.tokenPriceService.getTokenPrice(
        config.NATIVE_TOKEN_SYMBOL[depositParams.fromChainId]
      );
      log.info(`tokenPriceInUsd: ${tokenPriceInUsd}`);

      let depositCostInUsd = depositCostInNativeCurrency.mul(tokenPriceInUsd);
      log.info(`depositCostInUsd: ${depositCostInUsd}`);

      return depositCostInUsd;
    } catch (error: any) {
      log.error(`error: ${stringify(error)} `);
      throw new Error(error);
    }
  }
}

export { HyphenBridge };
