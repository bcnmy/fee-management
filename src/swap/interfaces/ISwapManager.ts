export interface ISwapManager {
    getSupportedTokenList(chainId: number): Promise<Record<string, string>> ;
    getQuote(chainId: any, fromtoken: any, toToken: any, amount: any);

}