import { BigNumber, ethers } from 'ethers';
import { QuoteRequestParam, RouteParams, SwapCostParams } from '../../types';
export interface ISwapManager {
  approveSpender(fromChainId: number, swapTokenBalance: BigNumber, swapToTokenAddress: string): Promise<ethers.providers.TransactionResponse>;
  swapToken(route: RouteParams): Promise<ethers.providers.TransactionResponse>;
  checkDexAllowance(fromChainId: number, tokenAddress: string): Promise<BigNumber>;
  initiateSwap(chainId: number): Promise<any>;
  getSwapCost(swapCostParams: SwapCostParams): Promise<ethers.BigNumber>;
  initialiseSwapTokenList(chainId: number): void;
  getQuote(quoteRequestParam: QuoteRequestParam): any;
  getSwapTokenList(chainId: number): Record<string, string>;
}
