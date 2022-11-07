import { config } from '../../config';
import { ISwapManager } from '../interfaces/ISwapManager';
import { QuoteRequestParam } from "../../types";
import { log } from '../../logs';
import { stringify } from '../../utils/common-utils';

const fetch = require('node-fetch');

class OneInchManager implements ISwapManager {
  // TODO add try catch
  async getQuote(quoteRequestParam: QuoteRequestParam) {
    try {
      log.info(`getQuote() quoteRequestParam: ${quoteRequestParam}`);
      const url = this.apiRequestUrl('/quote', quoteRequestParam.chainId, {
        fromTokenAddress: quoteRequestParam.fromTokenAddress,
        toTokenAddress: quoteRequestParam.toTokenAddress,
        amount: quoteRequestParam.amount,
      });

      log.info(`getQuote() url: ${url}`);

      const response = await fetch(url)
        .then((res: any) => res.json())
        .then((res: any) => stringify(res));
      log.info(`getQuote() response: ${stringify(response)}`);

      return response;
    } catch (error: any) {
      log.error(`Error while Getting swap Quote from 1inch api for params ${quoteRequestParam}`);
      throw new Error(error);
    }
  }

  apiRequestUrl(methodName: string, chainId: number, queryParams: any): string {
    return config.oneInchApiBaseUrl + chainId + methodName + '?' + new URLSearchParams(queryParams).toString();
  }

  async getSupportedTokenList(chainId: number): Promise<Record<string, string>> {
    try {
      log.info(`getSupportedTokenList() chainId: ${chainId}`);
      const supportedTokenurl = this.apiRequestUrl('/tokens', chainId, null);

      log.info(`supportedTokenurl: ${supportedTokenurl}`);
      const response = await fetch(supportedTokenurl)
        .then((res: any) => res.json())
        .then((res: any) => res);
      log.info(`getSupportedTokenList() response: ${stringify(response)}`);

      let tokenList: Record<string, string> = {};
      for (let tokenAddress in response.tokens) {
        let symbol = response.tokens[tokenAddress].symbol;
        tokenList[symbol] = tokenAddress;
      }

      log.info(`tokenList: ${stringify(tokenList)}`);
      return response.tokenList;
    } catch (error: any) {
      throw new Error(error);
    }
  }
}

export { OneInchManager };
