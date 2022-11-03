import { BigNumber, ethers } from "ethers";
import { INetwork } from "../blockchain/interface/INetwork";
import { config } from "../config";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { ITokenPrice } from "../relayer-node-interfaces/ITokenPrice";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { BridgeParams, EVMRawTransactionType, ExitParams, HyphenDepositParams, MasterFundingAccount } from "../types";
import { IBridgeService } from "./interfaces/IBridgeService";
import fetch from "node-fetch";

class HyphenBridge implements IBridgeService {
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  networkMap: Record<number, INetwork>;
  tokenPriceService: ITokenPrice;
  masterFundingAccount: MasterFundingAccount;

  constructor(bridgeParams: BridgeParams) {
    this.transactionServiceMap = bridgeParams.transactionServiceMap;
    this.networkMap = bridgeParams.networkMap;
    this.tokenPriceService = bridgeParams.tokenPriceService;
    this.masterFundingAccount = bridgeParams.masterFundingAccount;
  }

  apiRequestUrl(methodName: string, queryParams: any): string {
    return config.hyphenBaseUrl + methodName + "?" + new URLSearchParams(queryParams).toString();
  }
  async getHyphenSupportedToken(chainId: number): Promise<Record<string, Record<number, string>>> {
    try {
      const supportedTokenurl = this.apiRequestUrl(config.hyphenSupportedTokenEndpoint, {
        networkId: chainId,
      });

      const response: any = await fetch(supportedTokenurl)
        .then((res) => res.json())
        .then((res) => res);

      let tokens = {};
      for (let index = 0; index < response.supportedPairList.length; index++) {
        let tokenPair = response.supportedPairList[index];
        if (tokens[tokenPair.address] == undefined) {
          tokens[tokenPair.address] = {
            [tokenPair.toChainId]: tokenPair.toChainToken,
          };
        } else {
          tokens[tokenPair.address][tokenPair.toChainId] = tokenPair.toChainToken;
        }
      }

      return tokens;
    } catch (error) {
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

      const response: any = await fetch(transferFeeUrl)
        .then((res) => res.json())
        .then((res) => res);
      return response.netTransferFee;
    } catch (error) {
      throw new Error(error);
    }
  }

  async getDepositCost(depositParams: HyphenDepositParams): Promise<ethers.BigNumber> {
    try {
      const hyphenContract: ethers.Contract = this.networkMap[depositParams.fromChainId].getLiquidityPoolInstance();
      let rawDepositTransaction;
      let value = ethers.utils.parseEther("0");

      if (depositParams.tokenAddress.toLowerCase() === config.NATIVE_ADDRESS) {
        rawDepositTransaction = await hyphenContract.populateTransaction.depositNative(
          depositParams.receiver,
          depositParams.toChainId,
          depositParams.tag
        );
        value = ethers.utils.parseEther(depositParams.amount.toString());
      } else {
        rawDepositTransaction = await hyphenContract.populateTransaction.depositErc20(
          depositParams.toChainId,
          depositParams.tokenAddress,
          depositParams.receiver,
          depositParams.amount,
          depositParams.tag
        );
      }

      const depositGasSpend = await this.transactionServiceMap[
        depositParams.fromChainId
      ].networkService.ethersProvider.estimateGas({
        from: this.masterFundingAccount.publicAddress,
        to: config.hyphenLiquidityPoolAddress[depositParams.fromChainId],
        data: rawDepositTransaction.data,
        value: value,
      });

      let networkGasPrice = await this.transactionServiceMap[depositParams.fromChainId].networkService.getGasPrice();
      let depositCostInNativeCurrency = depositGasSpend.mul(networkGasPrice.gasPrice);

      let tokenPriceInUsd = await this.tokenPriceService.getTokenPrice(
        config.NATIVE_TOKEN_SYMBOL[depositParams.fromChainId]
      );
      let depositCostInUsd = depositCostInNativeCurrency.mul(tokenPriceInUsd);
      return depositCostInUsd;
    } catch (error) {
      throw new Error(error);
    }
  }
}

export { HyphenBridge };
