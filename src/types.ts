import { ICacheService } from './relayer-node-interfaces/ICacheService';
import { ITokenPrice } from './relayer-node-interfaces/ITokenPrice';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import { ITransactionService } from './relayer-node-interfaces/ITransactionService';
import { IEVMAccount } from './relayer-node-interfaces/IEVMAccount';
import { ISwapManager } from './swap/interfaces/ISwapManager';
import { IBridgeService } from './bridge/interfaces/IBridgeService';
import { IBalanceManager } from './gas-management/interfaces/IBalanceManager';

type ChainIdWithStringValueType = {
  [key: number]: string
};

type ChainIdWithArrayStringValueType = {
  [key: number]: string[]
};

type ChainIdWithNumberValueType = {
  [key: number]: number
};

type ChainIdWithBigNumberValueType = {
  [key: number]: ethers.BigNumber
};

type ChainIdAndTokenWithNumberValueType = {
  [key: number]: {
    [key: string]: number;
  }
};

type ChainIdAndTokenWithStringValueType = {
  [key: number]: {
    [key: string]: string;
  }
};

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
  appConfig: AppConfig;
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
  appConfig: AppConfig;
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
  swapToTokenAddress: string;
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
  nativeTokenSymbol: ChainIdWithStringValueType,
  noOfDepositConfirmation: ChainIdWithNumberValueType,
  hyphenLiquidityPoolAddress: ChainIdWithStringValueType,
  balanceThreshold: ChainIdAndTokenWithNumberValueType;
  feeSpendThreshold: ChainIdWithNumberValueType;
  initialFundingAmountInUsd: ChainIdWithNumberValueType;
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

export type TransactionQueueMessageType = {
  transactionId: string,
  event: SocketEventType,
  relayerManagerName: string,
  transactionHash?: string,
  previousTransactionHash?: string,
  receipt?: ethers.providers.TransactionReceipt,
  error?: string,
};

export type TransactionListenerNotifyReturnType = {
  isTransactionRelayed: boolean;
  transactionExecutionResponse: null | ethers.providers.TransactionResponse;
};

export type NotifyTransactionListenerParamsType = {
  transactionExecutionResponse?: ethers.providers.TransactionResponse,
  transactionId: string,
  transactionReceipt?: ethers.providers.TransactionReceipt,
  relayerAddress: string,
  transactionType: TransactionType,
  previousTransactionHash?: string,
  rawTransaction?: EVMRawTransactionType,
  walletAddress: string,
  metaData?: any,
  relayerManagerName: string,
  ccmpMessage?: CCMPMessageType
  error?: string,
};

export type CCMPMessageType = {
  sender: string;
  sourceGateway: string;
  sourceAdaptor: string;
  sourceChainId: BigNumberish;
  destinationGateway: string;
  destinationChainId: BigNumberish;
  nonce: BigNumberish;
  routerAdaptor: CCMPRouterName;
  gasFeePaymentArgs: GasFeePaymentArgsStruct;
  payload: CCMPMessagePayloadType[];
  hash: string;
};

export type GasFeePaymentArgsStruct = {
  feeTokenAddress: string;
  feeAmount: BigNumberish;
  relayer: string;
};


export type CCMPMessagePayloadType = {
  to: string;
  _calldata: string;
};

export enum CCMPRouterName {
  WORMHOLE = 'wormhole',
  AXELAR = 'axelar',
  HYPERLANE = 'hyperlane',
}

export type ErrorTransactionResponseType = TransactionListenerNotifyReturnType & {
  state: 'failed';
  code: number;
  error: string;
  transactionId: string;
};

export type SuccessTransactionResponseType = TransactionListenerNotifyReturnType & {
  state: 'success';
  code: number;
  transactionId: string
};

export type TransactionDataType = {
  to: string;
  value: string;
  data: string;
  gasLimit: string; // value will be in hex
  speed?: GasPriceType;
  walletAddress: string,
  transactionId: string;
  ccmpMessage?: CCMPMessageType;
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
  walletAddress: string,
  metaData: any,
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

export type ExecuteTransactionParamsType = {
  rawTransaction: EVMRawTransactionType,
  account: IEVMAccount
};

export type ExecuteTransactionResponseType = {
  success: true;
  transactionResponse: ethers.providers.TransactionResponse,
} | {
  success: false;
  error: string;
};

export type RawTransactionType = {
  from: string;
  gasPrice?: string;
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
  gasLimit: {
    _hex: string;
    _isBigNumber: boolean;
  };
  to: string;
  value: {
    _hex: string;
    _isBigNumber: boolean;
  };
  data: string;
  chainId: number;
  nonce: number;
};

export enum RpcMethod {
  getGasPrice,
  getEIP1159GasPrice,
  getBalance,
  estimateGas,
  getTransactionReceipt,
  getTransactionCount,
  sendTransaction,
  waitForTransaction,
}

export type SCWTransactionMessageType = {
  type: string;
  to: string;
  data: string;
  gasLimit: string;
  chainId: number;
  value: string;
  transactionId: string;
  walletAddress: string;
};