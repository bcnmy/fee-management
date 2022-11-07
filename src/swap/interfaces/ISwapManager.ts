import { QuoteRequestParam } from '../../types';
export interface ISwapManager {
  getSupportedTokenList(chainId: number): Promise<Record<string, string>>;
  getQuote(quoteRequestParam: QuoteRequestParam): any;
}
