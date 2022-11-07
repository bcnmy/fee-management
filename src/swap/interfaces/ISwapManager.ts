import { ethers } from 'ethers';
import { QuoteRequestParam, SwapCostParams } from '../../types';
export interface ISwapManager {
  getSwapCost(swapCostParams: SwapCostParams): Promise<ethers.BigNumber>;
  initialiseSwapTokenList(chainId: number): void;
  getQuote(quoteRequestParam: QuoteRequestParam): any;
  getSwapTokenList(chainId: number): Record<number, string>;
}
