import { Contract } from "@ethersproject/contracts";
import { ContractInterface, BigNumberish } from "ethers";

type Modify<T, R> = Omit<T, keyof R> & R;

export type Environment = "test" | "staging" | "prod";

export type MasterFundingAccount = {
    publicAddress: string;
    privateKey: string;
}

export type TokenList = {
    networkId: number;
    tokenData: TokenData[];
}

export type TokenData = {
    tokenAddress: string;
    symbol: string;
    decimal: number;
}

export type rpcUrlMap = {
    networkId: number;
    rpcUrl: string;
}