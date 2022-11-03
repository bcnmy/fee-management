import { BigNumber } from "ethers";
export interface ISwapManager {
  getSupportedTokenList(chainId: number): Promise<Record<string, string>>;
  getQuote(chainId: number, fromToken: string, toToken: string, amount: BigNumber);
}
