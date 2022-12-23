import { ConsumeMessage } from "amqplib";
import { IQueue } from "../../relayer-node-interfaces/IQueue";
import { RetryTransactionQueueData } from "../../types";

export class MockRetryQueue implements IQueue<RetryTransactionQueueData>{
    publish(arg0: RetryTransactionQueueData): Promise<boolean> {
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