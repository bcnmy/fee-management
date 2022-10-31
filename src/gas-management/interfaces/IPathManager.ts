import { DeltaMap, TokenData } from "../../types";

export interface IPathManager {
    setOneInchSupportedTokenMap(oneIncheTokenMap:  Record<number, Record<string, string>> );
    setHyphenSupportedTokenMap(hyphenSupportedTokenMap: Record<number, TokenData>);
    findAllRoutes(chainWiseDelta: DeltaMap, chainId: number): unknown;
}