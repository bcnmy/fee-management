import { ICacheService } from "../../relayer-node-interfaces/ICacheService";
import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { INetworkService } from "../../relayer-node-interfaces/INetworkService";
import { INonceManager } from "../../relayer-node-interfaces/INonceManager";
import { EVMRawTransactionType } from "../../types";
import { MockCache } from "./mockCache";
import { MockNetworkService } from "./mockNetworkService";

export class MockNonceManager implements INonceManager<IEVMAccount, EVMRawTransactionType> {
    chainId: number = 5;
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType> = new MockNetworkService();
    cacheService: ICacheService = new MockCache();

    getNonce(address: string, pendingCount?: boolean | undefined): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getAndSetNonceFromNetwork(address: string, pendingCount: boolean): Promise<number> {
        throw new Error("Method not implemented.");
    }
    markUsed(address: string, nonce: number): Promise<void> {
        throw new Error("Method not implemented.");
    }
    incrementNonce(address: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }


}