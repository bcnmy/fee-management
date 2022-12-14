export interface IAccumulatedFee {
  startTime: number;
  endTime: number;
  chainId: number;
  feeAccumulatedInNative: Number;
  feeAccumulatedInUSD: Number;
  tokenSymbol: string;
  transactionType: string;
  feeAccumulated: number;
  status: string;
  creationTime: number;
  updationTime: number;
}
