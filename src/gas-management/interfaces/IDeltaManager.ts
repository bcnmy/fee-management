import { DeltaMap } from "../../types";

export interface IDeltaManager {
    calculateDelta(mfaUSDBalanceMap: Map<number, number>, chainToRebalance: number): Promise<DeltaMap>;
    calculateMFABalanceInUSD(): Promise<Map<number, number>>;
}