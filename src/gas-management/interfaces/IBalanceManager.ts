import { BigNumber } from "ethers";
export interface IBalanceManager {
  calculateMFABalanceInUSD(): Promise<Map<number, number>>;
  getBalance(chainId: number, tokenAddress: string): Promise<BigNumber>;
}
