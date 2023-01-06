import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { EVMRawTransactionType } from "../../types";

export class MockMFA implements IEVMAccount {
    getPublicKey(): string {
        return "0xF86B30C63E068dBB6bdDEa6fe76bf92F194Dc53c";
    }
    signMessage(message: string): Promise<string> {
        throw new Error("Method not implemented.");
    }
    signTransaction(rawTransaction: EVMRawTransactionType): Promise<string> {
        throw new Error("Method not implemented.");
    }

}