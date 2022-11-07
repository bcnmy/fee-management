import { ethers } from "ethers";
import { BridgeCostParams, ExitParams, HyphenDepositParams } from "../../types";

export interface IBridgeService {
  initializeBridgeTokenList(chainId: number): void;
  getDepositCost(depositParams: HyphenDepositParams): Promise<ethers.BigNumber>;
  getExitCost(exitParams: ExitParams): Promise<number>;
  getBridgeTokenList(chainId: number): Record<string, Record<number, string>>;
  getBridgeCost(brigeCostParams: BridgeCostParams): Promise<ethers.BigNumber>;
}
