import { IBlockchainTransaction } from "../../relayer-node-interfaces/IBlockchainTransaction";
import { ITransactionDAO } from "../../relayer-node-interfaces/ITransactionDAO";

export class MockTransactionDao implements ITransactionDAO {
    save(chainId: number, transactionData: object): Promise<void> {
        throw new Error("Method not implemented.");
    }
    updateByTransactionId(chainId: number, id: string, transactionData: object): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getByTransactionId(chainId: number, id: string): Promise<IBlockchainTransaction[] | null> {
        throw new Error("Method not implemented.");
    }
    updateByTransactionIdAndTransactionHash(chainId: number, id: string, hash: string, transactionData: object): Promise<void> {
        throw new Error("Method not implemented.");
    }

}