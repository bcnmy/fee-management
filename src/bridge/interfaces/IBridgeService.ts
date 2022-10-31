import { ethers } from "ethers";
import { ExitParams, HyphenDepositParams } from "../../types";

export interface IBridgeService {
    getHyphenSupportedToken(chainId: number);
    getDepositCost(depositParams: HyphenDepositParams): Promise<ethers.BigNumber>;
    getExitCost(exitParams: ExitParams): Promise<number>;

}