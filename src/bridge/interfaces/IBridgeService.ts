import { ethers } from "ethers";
import { ExitParams, HyphenDepositParams } from "../../types";

export interface IBridgeService {
  getHyphenSupportedToken(chainId: number): Promise<Record<string, Record<number, string>>>;
  getDepositCost(depositParams: HyphenDepositParams): Promise<ethers.BigNumber>;
  getExitCost(exitParams: ExitParams): Promise<number>;
}
