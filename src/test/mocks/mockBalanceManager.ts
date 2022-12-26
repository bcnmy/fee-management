import { BigNumber } from "ethers";
import { IBalanceManager } from "../../gas-management/interfaces/IBalanceManager";

export class MockBalanceManager implements IBalanceManager {
    calculateMFABalanceInUSD(): Promise<Record<number, number>> {
        throw new Error("Method not implemented.");
    }
    getBalance(chainId: number, tokenAddress: string): Promise<BigNumber> {
        throw new Error("Method not implemented.");
    }
}