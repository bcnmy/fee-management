import { BigNumber } from 'ethers';
export interface IBalanceManager {
  calculateMFABalanceInUSD(): Promise<Record<number, number>>;
  getBalance(chainId: number, tokenAddress: string): Promise<BigNumber>;
}
