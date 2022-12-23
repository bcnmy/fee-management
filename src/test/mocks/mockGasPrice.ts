import { ICacheService } from "../../relayer-node-interfaces/ICacheService";
import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { IGasPrice } from "../../relayer-node-interfaces/IGasPrice";
import { INetworkService } from "../../relayer-node-interfaces/INetworkService";
import { EVMRawTransactionType, GasPriceType, NetworkBasedGasPriceType } from "../../types";
import { MockCache } from "./mockCache";
import { MockNetworkService } from "./mockNetworkService";


export class MockGasPrice implements IGasPrice {
    chainId: number = 5;
    networkService: INetworkService<IEVMAccount, EVMRawTransactionType> = new MockNetworkService();
    cacheService: ICacheService = new MockCache();
    setGasPrice(gasType: GasPriceType, price: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getGasPrice(gasType?: GasPriceType | undefined): Promise<NetworkBasedGasPriceType> {
        throw new Error("Method not implemented.");
    }
    getGasPriceForSimulation(gasType?: GasPriceType | undefined): Promise<string> {
        throw new Error("Method not implemented.");
    }
    setMaxFeeGasPrice(gasType: GasPriceType, price: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getMaxFeeGasPrice(gasType: GasPriceType): Promise<string> {
        throw new Error("Method not implemented.");
    }
    setMaxPriorityFeeGasPrice(gasType: GasPriceType, price: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getMaxPriorityFeeGasPrice(gasType: GasPriceType): Promise<string> {
        throw new Error("Method not implemented.");
    }
    getBumpedUpGasPrice(pastGasPrice: NetworkBasedGasPriceType, bumpingPercentage: number): NetworkBasedGasPriceType {
        throw new Error("Method not implemented.");
    }
}