import { TransactionResponse, TransactionReceipt } from "@ethersproject/abstract-provider";
import { JsonRpcProvider } from "@ethersproject/providers";
import { BigNumber, Contract } from "ethers";
import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { INetworkService } from "../../relayer-node-interfaces/INetworkService";
import { EVMRawTransactionType, RawTransactionType, RpcMethod, Type0TransactionGasPriceType, Type2TransactionGasPriceType } from "../../types";

export class MockNetworkServiceFail implements INetworkService<IEVMAccount, EVMRawTransactionType>{
    chainId: number = 5;
    rpcUrl: string = "";
    fallbackRpcUrls: string[] = [];
    ethersProvider: JsonRpcProvider = new JsonRpcProvider();
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
        throw new Error("Method not implemented.");
    }
    getEIP1559GasPrice(): Promise<Type2TransactionGasPriceType> {
        throw new Error("Method not implemented.");
    }
    getBalance(address: string): Promise<BigNumber> {
        throw new Error("Error while fetching MFA 0xF86B30C63E068dBB6bdDEa6fe76bf92F194Dc53c balance for token 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee on chain 5: {}");
    }
    getContract(abi: string, contractAddress: string): Contract {
        throw new Error("Method not implemented.");
    }
    getNonce(address: string, pendingNonce?: boolean | undefined): Promise<number> {
        throw new Error("Method not implemented.");
    }
    executeReadMethod(abi: string, contractAddress: string, methodName: string, params: object): Promise<object> {
        throw new Error("Error while fetching MFA 0xF86B30C63E068dBB6bdDEa6fe76bf92F194Dc53c balance for token 0x64ef393b6846114bad71e2cb2ccc3e10736b5716 on chain 5: {}");
    }
    estimateGas(contract: Contract, methodName: string, params: object, from: string): Promise<BigNumber> {
        throw new Error("Method not implemented.");
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