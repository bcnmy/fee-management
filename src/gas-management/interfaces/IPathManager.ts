import { DeltaMap, RouteParams, TokenData } from '../../types';

export interface IPathManager {
  rebalanceMFA(routes: RouteParams[], positiveDeltaMap: Record<number, number>): any;
  findAllRoutes(chainWiseDelta: DeltaMap, chainId: number): Promise<Array<RouteParams>>;
}
