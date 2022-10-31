import { BigNumber } from "ethers";
export interface IBalanceManager {
    getBalance(chainId: number, tokenAddress: string): Promise<BigNumber> ;

}