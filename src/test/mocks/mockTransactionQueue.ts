import { ConsumeMessage } from "amqplib";
import { IQueue } from "../../relayer-node-interfaces/IQueue";
import { TransactionQueueMessageType } from "../../types";

export class MockTransactionQueue implements IQueue<TransactionQueueMessageType>{
    publish(arg0: TransactionQueueMessageType): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    chainId: number = 5;

    connect(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    consume(onMessageReceived: () => void): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    ack(arg0: ConsumeMessage): Promise<void> {
        throw new Error("Method not implemented.");
    }

}