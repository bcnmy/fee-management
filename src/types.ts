import { ICacheService } from './relayer-node-interfaces/ICacheService';
import { ITokenPrice } from './relayer-node-interfaces/ITokenPrice';
import { BigNumber, ethers } from 'ethers';
import { ITransactionService } from './relayer-node-interfaces/ITransactionService';
import { IEVMAccount } from './relayer-node-interfaces/IEVMAccount';
import { ISwapManager } from './swap/interfaces/ISwapManager';
import { IBridgeService } from './bridge/interfaces/IBridgeService';
import { IBalanceManager } from './gas-management/interfaces/IBalanceManager';

export type Environment = 'test' | 'staging' | 'prod';

export enum TransactionType {
  AA = 'AA',
  SCW = 'SCW',
  CROSS_CHAIN = 'CROSS_CHAIN',
  FUNDING = 'FUNDING',
}

export type MasterFundingAccount = {
  publicAddress: string;
  privateKey: string;
};

export enum Mode {
  CROSS_CHAIN = "CROSS_CHAIN",
  SINGLE_CHAIN = "SINGLE_CHAIN"
}

export type FeeManagerParams = {
  masterFundingAccount: IEVMAccount;
  relayerAddresses: String[];
  appConfig: AppConfig;
  dbUrl: string;
  tokenPriceService: ITokenPrice;
  cacheService: ICacheService;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  mode: Mode;
  label: string,
};


export type DeltaManagerParams = {
  cacheService: ICacheService;
  masterFundingAccount: IEVMAccount;
  appConfig: AppConfig;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
};

export type PathParams = {
  swapManager: ISwapManager;
  bridgeServiceMap: Record<number, IBridgeService>;
  masterFundingAccount: IEVMAccount;
  tokenList: Record<number, TokenData[]>;
  appConfig: AppConfig;
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
};

export type SwapParams = {
  tokenPriceService: ITokenPrice;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  balanceManager: IBalanceManager;
  tokenList: Record<number, TokenData[]>;
  balanceThreshold: Record<number, Record<string, number>>,
  masterFundingAccount: IEVMAccount;
  label: string
};

export type NetworkParams = {
  provider: ethers.providers.JsonRpcProvider;
  liquidityPoolAddress: string;
};

export type BalanceManagerParams = {
  masterFundingAccount: IEVMAccount;
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  tokenList: Record<number, TokenData[]>;
  tokenPriceService: ITokenPrice;
};

export type BridgeParams = {
  transactionService: ITransactionService<IEVMAccount, EVMRawTransactionType>;
  // networkMap: Record<number, INetwork>;
  liquidityPoolAddress: string;
  tokenPriceService: ITokenPrice;
  masterFundingAccount: IEVMAccount;
};

export type ExitParams = {
  fromChainId: number;
  toChainId: number;
  tokenAddress: string;
  transferAmount: string;
};

export type BridgeCostParams = {
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  fromTokenBalance: BigNumber;
  toTokenAddress: string;
};

export type SwapCostParams = {
  fromChainId: number;
  toChainId: number;
  swapFromTokenAddress: string;
};

export type QuoteRequestParam = {
  chainId: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: BigNumber
}

export type RouteParams = {
  costInUsd: BigNumber;
  fromChainId: number;
  toChainId: number;
  tokenAddress: string;
  action: RouteType;
};

export enum RouteType {
  SWAP_N_BRIDGE,
  BRIDGE_N_SWAP,
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
  balanceThreshold: Record<number, Record<string, number>>;
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
  DEFAULT = 'default',
  MEDIUM = 'medium',
  FAST = 'fast',
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
  state: 'failed';
  code: number;
  error: string;
};

export type SuccessTransactionResponseType = TransactionListenerNotifyReturnType & {
  state: 'success';
  code: number;
};

export type TransactionDataType = {
  to: string;
  value: string;
  data: string;
  gasLimit: string; // value will be in hex
  speed?: GasPriceType;
  walletAddress: string,
  transactionId: string;
  metaData?: {
    dappAPIKey: string
  }
};

export type HyphenDepositParams = {
  fromChainId: number;
  toChainId: number;
  tokenAddress: string;
  receiver: string;
  amount: BigNumber;
  tag: string;
};

export type DeltaMap = {
  positiveDeltaMap: Record<number, number>;
  negativeDeltaMap: Record<number, number>;
};

export enum SocketEventType {
  onTransactionHashGenerated = 'transactionHashGenerated',
  onTransactionHashChanged = 'transactionHashChanged',
  onTransactionMined = 'transactionMined',
  onTransactionError = 'error',
}

export type RetryTransactionQueueData = {
  relayerAddress: string,
  transactionType: TransactionType,
  transactionHash?: string,
  transactionId: string,
  rawTransaction: EVMRawTransactionType,
  userAddress: string,
  relayerManagerName: string,
  event: SocketEventType
};
export type RetryTransactionDataType = RetryTransactionQueueData;

export type RawTransactionParam = {
  data: string;
  gasPrice: string;
  to: string;
  value: string;
  from: string;
  gasLimit: string;
  nonce: string;
  chainId: number;
  gas: string
}