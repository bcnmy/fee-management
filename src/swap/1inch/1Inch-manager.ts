// import "{ } from "./types";
import { BigNumber } from "ethers";
import { config } from "../../config";
const fetch = require('node-fetch');
import { ISwapManager } from "../interfaces/ISwapManager";

class OneInchManager implements ISwapManager {

    // TODO add try catch
    async getQuote(chainId: number, fromTokenAddress: string, toTokenAddress: string, amount: BigNumber) {
        try{
            const url = this.apiRequestUrl('/quote', chainId, {
                fromTokenAddress: fromTokenAddress,
                toTokenAddress: toTokenAddress,
                amount: amount
            });
    
            const response = await fetch(url).then(res => res.json()).then(res => JSON.stringify(res));
            return response;
        } catch (error){
            throw new Error(error);
        }
    }

    apiRequestUrl( methodName: string, chainId: number, queryParams: any ): string {
        return config.oneInchApiBaseUrl + chainId +methodName + '?' + (new URLSearchParams(queryParams)).toString();
    }
    
    async getSupportedTokenList(chainId: number): Promise<Record<string, string>> {
        try {
            const supportedTokenurl = this.apiRequestUrl("/tokens", chainId, null);
            const response = await fetch(supportedTokenurl).then(res => res.json()).then(res => res);
            
            let tokenList = {};
            for(let tokenAddress in response.tokens){
                let symbol = response.tokens[tokenAddress].symbol;
                tokenList[symbol] = tokenAddress;
            }
            return response.tokenList;
        } catch (error){
            throw new Error(error);
        }
    }
}

export { OneInchManager }