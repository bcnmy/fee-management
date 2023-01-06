import { BigNumber } from "ethers";
import { IBridgeService } from "../../bridge/interfaces/IBridgeService";
import { HyphenDepositParams, ExitParams, BridgeCostParams } from "../../types";

export class MockBridgeService implements IBridgeService {

    hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>> = {};

    checkBridgeAllowane(fromChainId: number, swapToTokenAddress: string): Promise<BigNumber> {
        throw new Error("Method not implemented.");
    }
    initializeBridgeTokenList(chainId: number): void {
        this.hyphenSupportedTokenMap[5] = {
            "0x64ef393b6846114bad71e2cb2ccc3e10736b5716": {
                "80001": "0xeaBc4b91d9375796AA4F69cC764A4aB509080A58"
            }
        }

        this.hyphenSupportedTokenMap[5] = {
            "0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF": {
                "80001": "0xdA5289fCAAF71d52a80A254da614a192b693e977"
            }
        }

        this.hyphenSupportedTokenMap[5] = {
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee ": {
                "80001": "0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa "
            }
        }
    }
    getDepositCost(depositParams: HyphenDepositParams): Promise<BigNumber> {
        throw new Error("Method not implemented.");
    }
    getExitCost(exitParams: ExitParams): Promise<number> {
        throw new Error("Method not implemented.");
    }
    getBridgeTokenList(chainId: number): Record<string, Record<number, string>> {
        throw new Error("Method not implemented.");
    }
    getBridgeCost(brigeCostParams: BridgeCostParams): Promise<BigNumber> {
        throw new Error("Method not implemented.");
    }

}