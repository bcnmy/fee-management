import { DeltaMap } from '../../types';

export interface IDeltaManager {
  calculateDelta(mfaUSDBalanceMap: Record<number, number>, chainToRebalance: number): Promise<DeltaMap>;
}
