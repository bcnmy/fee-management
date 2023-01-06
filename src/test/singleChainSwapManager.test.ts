jest.mock('node-fetch');

import { BigNumber } from "ethers";
import { IBalanceManager } from "../gas-management/interfaces/IBalanceManager";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { SingleChainSwapManager } from "../swap/1inch/SingleChainSwapManager";
import { AppConfig, EVMRawTransactionType } from "../types";
import { MockBalanceManager } from "./mocks/mockBalanceManager";
import { MockMFA } from "./mocks/mockMFA";
import { MockCache } from './mocks/mockCache';
import { MockTokenService } from "./mocks/mockTokenService";
import { MockTransactionService } from "./mocks/mockTransactionService";
import { MockTransactionServiceFail } from "./mocks/mockTransactionServiceFail";
import { ICacheService } from "../relayer-node-interfaces/ICacheService";

const fetch = require('node-fetch');

describe('SingleChainSwapManager Class', () => {

    let singleChainSwapManager: SingleChainSwapManager;
    let transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>> = {};
    let transactionServiceFailMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>> = {};
    let balanceManager: IBalanceManager;
    let appConfig: AppConfig;
    let label: string;
    let tokenPriceService;
    let masterFundingAccount;
    let chainId = 5;
    let cacheService: ICacheService;
    let tokenAddress = "0x64ef393b6846114bad71e2cb2ccc3e10736b5716";

    let oneInchTokenListResponse = {
        "tokens": {
            "0x64ef393b6846114bad71e2cb2ccc3e10736b5716": {
                "symbol": "USDT",
                "name": "USDT",
                "decimals": 18,
                "address": "0x64ef393b6846114bad71e2cb2ccc3e10736b5716",
                "logoURI": "",
                "tags": [
                    "tokens",
                    "USDT"
                ]
            }
        },
        "0xbf22b04e250a5921ab4dc0d4ced6e391459e92d4": {
            "symbol": "USDT",
            "name": "USDT",
            "decimals": 18,
            "address": "0xbf22b04e250a5921ab4dc0d4ced6e391459e92d4",
            "logoURI": "",
            "tags": [
                "tokens",
                "USDT"
            ]
        }
    }


    beforeAll(async () => {
        balanceManager = new MockBalanceManager();
        appConfig = {
            swapInAction: "oneicnh",
            tokenList: {},
            nativeTokenSymbol: {},
            noOfBlockConfirmation: {},
            hyphenLiquidityPoolAddress: {},
            balanceThreshold: {},
            feeSpendThreshold: {},
            initialFundingAmountInUsd: {}
        };

        tokenPriceService = new MockTokenService();
        cacheService = new MockCache();
        let transactionService = new MockTransactionService();
        transactionServiceMap[chainId] = transactionService;

        let transactionServiceFail = new MockTransactionServiceFail();
        transactionServiceFailMap[chainId] = transactionServiceFail;

        tokenPriceService = new MockTokenService();
        masterFundingAccount = new MockMFA();

        singleChainSwapManager = new SingleChainSwapManager({
            cacheService,
            masterFundingAccount,
            transactionServiceMap,
            appConfig,
            tokenPriceService,
            balanceManager,
            label
        });
    })

    it('checkDexAllowane(): Return allowance value', async () => {
        fetch.mockResolvedValueOnce(Promise.resolve({
            json: () =>
                Promise.resolve(BigNumber.from(10000)),
        }))

        expect(await singleChainSwapManager.checkDexAllowance(chainId, tokenAddress)).resolves;

    });

    it('approveSpender(): Approve amount to 1incheRouter', async () => {
        fetch.mockResolvedValueOnce(Promise.resolve({
            json: () =>
                Promise.resolve({
                    "data": "0x095ea7b30000000000000000000000001111111254eeb25477b68fb85ed929f73a960582000000000000000000000000000000000000000000000000000000174876e800",
                    "gasPrice": "10713023656",
                    "to": "0x111111111117dc0aa78b770fa6a738034120c302",
                    "value": "0"
                }),
        }))
        expect(await singleChainSwapManager.approveSpender(chainId, BigNumber.from(1), tokenAddress)).resolves;
    });

    it('approveSpender(): throw error', async () => {
        fetch.mockResolvedValueOnce(Promise.resolve({
            json: () =>
                (Promise.reject(new Error("Error while approving sender")))
        }))

        await expect(singleChainSwapManager.approveSpender(chainId, BigNumber.from(1), tokenAddress)).rejects.toThrow();
    });

    it('swapToNative(): converts Erc20 to Native token successfully', async () => {
        fetch.mockResolvedValueOnce(Promise.resolve({
            json: () =>
                Promise.resolve(
                    {
                        "fromToken": {
                            "symbol": "ETH",
                            "name": "Ethereum",
                            "decimals": 18,
                            "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                            "logoURI": "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png",
                            "tags": [
                                "native",
                                "PEG:ETH"
                            ]
                        },
                        "toToken": {
                            "symbol": "1INCH",
                            "name": "1INCH Token",
                            "decimals": 18,
                            "address": "0x111111111117dc0aa78b770fa6a738034120c302",
                            "logoURI": "https://tokens.1inch.io/0x111111111117dc0aa78b770fa6a738034120c302.png",
                            "eip2612": true,
                            "tags": [
                                "tokens"
                            ]
                        },
                        "toTokenAmount": "18305823967444387295",
                        "fromTokenAmount": "6054152507591302",
                        "protocols": [
                            [
                                [
                                    {
                                        "name": "SUSHI",
                                        "part": 100,
                                        "fromTokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                                        "toTokenAddress": "0x111111111117dc0aa78b770fa6a738034120c302"
                                    }
                                ]
                            ]
                        ],
                        "tx": {
                            "from": "0x3538fB8136BD83DEC94a508bd4f87fd43b3F5cA0",
                            "to": "0x1111111254eeb25477b68fb85ed929f73a960582",
                            "data": "0x0502b1c500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000015823839a18a86000000000000000000000000000000000000000000000000fb80ff692f59dd7e0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d034086f518368e0d49d5916e2bd9eb162e9952b7b04dcfee7c08",
                            "value": "6054152507591302",
                            "gas": 152209,
                            "gasPrice": "10894222629"
                        }
                    }),
        }))

        expect(await singleChainSwapManager.swapToNative(chainId, "123", tokenAddress)).resolves;
    });

    it('swapToNative(): Not enough balance to swap ', async () => {
        fetch.mockResolvedValueOnce(Promise.resolve({
            json: () =>
                Promise.resolve({
                    "statusCode": 400,
                    "error": "Bad Request",
                    "description": "Not enough ETH balance. Amount: 10000000000000000. Balance: 0",
                    "meta": [
                        {
                            "type": "fromTokenAddress",
                            "value": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
                        },
                        {
                            "type": "amount",
                            "value": "10000000000000000"
                        },
                        {
                            "type": "fromTokenBalance",
                            "value": "0"
                        }
                    ],
                    "requestId": "9d3238dc-2252-4ddb-bb04-fb3ce0a80988"
                }),
        }))

        await expect(singleChainSwapManager.swapToNative(chainId, "123", tokenAddress)).rejects.toThrow();
    });
});