import { IDBService } from "./relayer-node-interfaces/IDBService";
import { ICacheService } from "./relayer-node-interfaces/ICacheService";
import { ITokenPrice } from "./relayer-node-interfaces/ITokenPrice";
import { Mongoose } from "mongoose";
import { ethers } from "ethers";
import { ITransactionService } from "./relayer-node-interfaces/ITransactionService";
import { IEVMAccount } from "./relayer-node-interfaces/IEVMAccount";
import { ISwapManager } from "./swap/interfaces/ISwapManager";
import { IBridgeService } from "./bridge/interfaces/IBridgeService";
import { IBalanceManager } from "./gas-management/interfaces/IBalanceManager";
import { INetwork } from "./blockchain/interface/INetwork";

export type Environment = "test" | "staging" | "prod";

export type MasterFundingAccount = {
  publicAddress: string;
  privateKey: string;
};

export type FeeManagerParams = {
  rpcUrlMap: rpcUrlMap[];
  masterFundingAccount: MasterFundingAccount;
  relayerAddresses: String[];
  tokenList: Record<number, TokenData[]>;
  appConfig: AppConfig;
  dbService: IDBService<Mongoose | null>;
  tokenPriceService: ITokenPrice;
  cacheService: ICacheService;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
};

export type DeltaManagerParams = {
  cacheService: ICacheService;
  masterFundingAccount: MasterFundingAccount;
  tokenList: Record<number, TokenData[]>;
  appConfig: AppConfig;
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
};

export type PathParams = {
  swapManager: ISwapManager;
  bridgeService: IBridgeService;
  masterFundingAccount: MasterFundingAccount;
  tokenList: Record<number, TokenData[]>;
  appConfig: AppConfig;
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
}

export type NetworkParams = {
  provider: ethers.providers.JsonRpcProvider;
  liquidityPoolAddress: string;
}

export type BalanceManagerParams = {
  masterFundingAccount: MasterFundingAccount;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
}

export type BridgeParams = {
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  networkMap: Record<number, INetwork>;
  tokenPriceService: ITokenPrice;
  masterFundingAccount: MasterFundingAccount;
}

export type ExitParams = {
  fromChainId: number;
  toChainId: number;
  tokenAddress: string;
  transferAmount: string
}

export type TokenData = {
  address: string;
  symbol: string;
  decimal: number;
};

export type rpcUrlMap = {
  networkId: number;
  rpcUrl: string;
};

export type AppConfig = {
  tokenList: Record<number, TokenData[]>;
  feeSpendThreshold: Record<number, number>;
  InitialFundingAmountInUsd: Record<number, number>;
};

export type GasUsedThresholdPerNetwork = {
  chainId: number;
  thresholdInUsd: number;
};

export type Type2TransactionGasPriceType = {
  maxPriorityFeePerGas: string;
  maxFeePerGas: string;
};

export type Type0TransactionGasPriceType = {
  gasPrice: string;
};

export type ContractEventFilterType = {
  address: string;
  topics: Array<string>;
};

export type AccessListItem = {
  address: string;
  storageKeys: string[];
};

export type EVMRawTransactionType = {
  from: string;
  gasPrice?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  gasLimit: string;
  to: string;
  value: string;
  data: string;
  chainId: number;
  nonce: number;
  accessList?: AccessListItem[];
  type?: number;
};

export type NetworkBasedGasPriceType =
  | string
  | {
      maxPriorityFeePerGas: string;
      maxFeePerGas: string;
    };

export enum GasPriceType {
  DEFAULT = "default",
  MEDIUM = "medium",
  FAST = "fast",
}

export type TransactionMessageType = ethers.providers.TransactionResponse;

export type TransactionListenerNotifyReturnType = {
  isTransactionRelayed: boolean;
  transactionExecutionResponse: null | ethers.providers.TransactionResponse;
};

export type NotifyTransactionListenerParamsType = {
  transactionExecutionResponse: ethers.providers.TransactionResponse;
  transactionId: string;
  relayerAddress: string;
  userAddress?: string;
};

export type ErrorTransactionResponseType = {
  state: "failed";
  code: number;
  error: string;
};

export type SuccessTransactionResponseType =
  TransactionListenerNotifyReturnType & {
    state: "success";
    code: number;
  };

export type TransactionDataType = {
  to: string;
  value: string;
  data: string;
  gasLimit: string; // value will be in hex
  speed?: GasPriceType;
  userAddress?: string;
  transactionId: string;
};

export type HyphenDepositParams = {
  fromChainId: number,
  toChainId: number,
  tokenAddress: string,
  receiver: string,
  amount: number,
  tag: string
}



export type SwapParams = {

}

export type DeltaMap = {
  positiveDeltaMap: Map<number, number>;
  negativeDeltaMap: Map<number, number>;
}

