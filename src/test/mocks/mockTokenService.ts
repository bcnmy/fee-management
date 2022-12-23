import dist, { Lock } from "redlock";
import { log } from "../../logs";
import { ICacheService } from "../../relayer-node-interfaces/ICacheService";
import { ITokenPrice } from "../../relayer-node-interfaces/ITokenPrice";

export class MockTokenService implements ITokenPrice {
    getTokenPrice(symbol: string): Promise<number> {
        return Promise.resolve(1);
    }
    getTokenPriceByTokenSymbol(tokenSymbol: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getTokenPriceByTokenAddress(chainId: number, tokenAddress: string): Promise<number> {
        throw new Error("Method not implemented.");
    }


}