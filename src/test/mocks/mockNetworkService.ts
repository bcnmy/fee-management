import { TransactionResponse, TransactionReceipt } from "@ethersproject/abstract-provider";
import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, Contract } from "ethers";
import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { INetworkService } from "../../relayer-node-interfaces/INetworkService";
import { EVMRawTransactionType, RawTransactionType, RpcMethod, Type0TransactionGasPriceType, Type2TransactionGasPriceType } from "../../types";
import { MockJsonProvider } from "./mockJsonProvider";

export class MockNetworkService implements INetworkService<IEVMAccount, EVMRawTransactionType>{
    ethersProvider: JsonRpcProvider = new MockJsonProvider();
    getActiveRpcUrl(): string {
        throw new Error("Method not implemented.");
    }
    setActiveRpcUrl(rpcUrl: string): void {
        throw new Error("Method not implemented.");
    }
    getFallbackRpcUrls(): string[] {
        throw new Error("Method not implemented.");
    }
    setFallbackRpcUrls(rpcUrls: string[]): void {
        throw new Error("Method not implemented.");
    }
    useProvider(tag: RpcMethod, params?: any): Promise<any> {
        throw new Error("Method not implemented.");
    }
    sendRpcCall(method: string, params: object[]): Promise<any> {
        throw new Error("Method not implemented.");
    }
    getGasPrice(): Promise<Type0TransactionGasPriceType> {
        let gasPrice: Type0TransactionGasPriceType = {
            gasPrice: "1"
        }
        return Promise.resolve(gasPrice);
    }
    getEIP1559GasPrice(): Promise<Type2TransactionGasPriceType> {
        throw new Error("Method not implemented.");
    }
    getBalance(address: string): Promise<BigNumber> {
        return Promise.resolve(BigNumber.from(1));
    }
    getContract(abi: string, contractAddress: string): Contract {
        throw new Error("Method not implemented.");
    }
    getNonce(address: string, pendingNonce?: boolean | undefined): Promise<number> {
        throw new Error("Method not implemented.");
    }
    executeReadMethod(abi: string, contractAddress: string, methodName: string, params: object): Promise<object> {
        return Promise.resolve(new Object(BigNumber.from(1)))
    }
    estimateGas(contract: Contract, methodName: string, params: object, from: string): Promise<BigNumber> {
        return Promise.resolve(BigNumber.from("1"));
    }
    sendTransaction(rawTransactionData: EVMRawTransactionType, account: IEVMAccount): Promise<TransactionResponse> {
        throw new Error("Method not implemented.");
    }
    getContractEventEmitter(contractAddress: string, contractAbi: string, topic: string, contractEventName: string): Promise<import("events")> {
        throw new Error("Method not implemented.");
    }
    getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt> {
        throw new Error("Method not implemented.");
    }
    waitForTransaction(transactionHash: string): Promise<TransactionReceipt> {
        throw new Error("Method not implemented.");
    }
}