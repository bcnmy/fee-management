import { DeltaMap, RouteParams, TokenData } from '../../types';

export interface IPathManager {
  rebalanceMFA(routes: RouteParams[], positiveDeltaMap: Record<number, number>): any;
  // setOneInchSupportedTokenMap(oneIncheTokenMap: Record<number, Record<string, string>>): void;
  // setHyphenSupportedTokenMap(hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>>): void;
  findAllRoutes(chainWiseDelta: DeltaMap, chainId: number): Promise<Array<RouteParams>>;
}
