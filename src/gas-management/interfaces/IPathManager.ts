import { DeltaMap, RouteParams, TokenData } from "../../types";

export interface IPathManager {
  setOneInchSupportedTokenMap(oneIncheTokenMap: Record<number, Record<string, string>>);
  setHyphenSupportedTokenMap(hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>>);
  findAllRoutes(chainWiseDelta: DeltaMap, chainId: number): Promise<Array<RouteParams>>;
}
