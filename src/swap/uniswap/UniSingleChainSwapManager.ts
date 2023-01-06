import { config } from '../../config';
import { ISwapManager } from '../interfaces/ISwapManager';
import { AppConfig, EVMRawTransactionType, GasPriceType, QuoteRequestParam, RawTransactionParam, RouteParams, SwapCostParams, SwapParams, TransactionType } from "../../types";
import { log } from '../../logs';
import { generateTransactionId, stringify } from '../../utils/common-utils';
import IUniswapV2Router02 from "@uniswap/v2-periphery/build/IUniswapV2Router02.json";
import IUniswapV2Factory from "@uniswap/v2-periphery/build/IUniswapV2Factory.json";
import { BigNumber, ethers } from 'ethers';
import { ITokenPrice } from '../../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../../relayer-node-interfaces/ITransactionService';
import { IBalanceManager } from '../../gas-management/interfaces/IBalanceManager';
import { IEVMAccount } from '../../relayer-node-interfaces/IEVMAccount';
import { ICacheService } from '../../relayer-node-interfaces/ICacheService';
import { hexValue } from 'ethers/lib/utils';

export class UniSingleChainSwapManager implements ISwapManager {
    // TODO add try catch
    protected routerAbi = IUniswapV2Router02.abi;
    protected factoryAbi = IUniswapV2Factory.abi;

    tokenPriceService: ITokenPrice;
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
    balanceManager: IBalanceManager;
    appConfig: AppConfig;
    balanceThreshold: Record<number, Record<string, number>>;
    masterFundingAccount: IEVMAccount;
    label: string;
    cacheService: ICacheService;

    constructor(swapParams: SwapParams) {
        this.cacheService = swapParams.cacheService;
        this.appConfig = swapParams.appConfig;
        this.tokenPriceService = swapParams.tokenPriceService;
        this.transactionServiceMap = swapParams.transactionServiceMap;
        this.balanceManager = swapParams.balanceManager;
        this.balanceThreshold = swapParams.appConfig.balanceThreshold;
        this.masterFundingAccount = swapParams.masterFundingAccount;
        this.label = swapParams.label ? swapParams.label : "SingleChainAccountsManager"
    }

    getSwapTokenList(chainId: number): Record<string, string> {
        return {};
    }

    async initiateSwap(chainId: number): Promise<unknown> {
        let usdBalanceOfMFA: Record<number, number> = {};

        log.info("Initiate Swap");

        //TODO: Sachin: To be done later as optimisation: Use Promise.all to parallely calculate token balances https://www.geeksforgeeks.org/javascript-promise-all-method/
        try {
            let swapHashMap: Record<string, Record<string, string>> = {};
            for (let tokenRecordIndex = 0; tokenRecordIndex < this.appConfig.tokenList[chainId].length; tokenRecordIndex++) {
                let tokenAddress = this.appConfig.tokenList[chainId][tokenRecordIndex].address.toLowerCase();
                let tokenDecimal = this.appConfig.tokenList[chainId][tokenRecordIndex].decimal;
                if (tokenAddress !== config.NATIVE_ADDRESS_RELAYER && tokenAddress !== config.NATIVE_ADDRESS_ROUTER) {
                    try {
                        let tokenBalance = await this.balanceManager.getBalance(
                            Number(chainId),
                            tokenAddress
                        );

                        let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(
                            this.appConfig.tokenList[chainId][tokenRecordIndex].symbol
                        );

                        let balanceValueInUsd = tokenBalance.mul(tokenUsdPrice).div(ethers.BigNumber.from(10).pow(tokenDecimal));
                        if (!this.balanceThreshold[chainId][tokenAddress]) {
                            log.info(`balanceThreshold is not defined for ${tokenAddress} on chain ${chainId}`)
                        } else if (balanceValueInUsd.gt(this.balanceThreshold[chainId][tokenAddress])) {

                            let dexAllowance;
                            try {
                                dexAllowance = await this.checkDexAllowance(chainId, tokenAddress);
                            } catch (error: any) {
                                log.error(error);
                                break;
                            }

                            if (dexAllowance && tokenBalance.gt(dexAllowance.toString())) {
                                let approveRequest;
                                try {
                                    approveRequest = await this.approveSpender(chainId, config.INFINITE_APPROVAL_AMOUNT, tokenAddress);
                                } catch (error: any) {
                                    log.error(error);
                                    break;
                                }

                                let approveReceipt = await this.transactionServiceMap[chainId].networkService.waitForTransaction(
                                    approveRequest.hash,
                                    this.appConfig.noOfBlockConfirmation[chainId]
                                );
                                if (!approveReceipt || approveReceipt.status === 0) {
                                    log.error(`Approval Failed for token ${tokenAddress} on chain ${chainId}`);
                                    break;
                                }

                                swapHashMap[tokenAddress] = {
                                    "approveHash": approveReceipt.transactionHash
                                }
                            }

                            let swapRequest;
                            try {
                                swapRequest = await this.swapToNative(chainId, tokenBalance.toString(), tokenAddress);
                            } catch (error: any) {
                                log.error(error);
                                break;
                            }

                            let swapReceipt = await this.transactionServiceMap[chainId].networkService.waitForTransaction(
                                swapRequest.hash,
                                this.appConfig.noOfBlockConfirmation[chainId]
                            );

                            if (!swapReceipt || swapReceipt.status === 0) {
                                log.error(`Failed to get SwapReceipt for token ${tokenAddress} on chain ${chainId} with hash: swapRequest.hash`);
                                break;
                            }
                            if (swapHashMap[tokenAddress] != undefined) {
                                swapHashMap[tokenAddress]["swapHash"] = swapReceipt.transactionHash;
                            } else {
                                swapHashMap[tokenAddress] =
                                {
                                    "swapHash": swapReceipt.transactionHash
                                }
                            }
                        } else {
                            log.info(`Current token Balance < threshold, no need to swap`);
                        }
                    } catch (error: any) {
                        log.error(`Error calculating token usdBalance in MFA for chainId ${chainId} & tokenAddress: ${tokenAddress}`);
                        log.error(error);
                    }
                } else {
                    log.info(`No need to convert Native Token on chain ${chainId}`)
                }
            }
            log.info(`usdBalanceOfMFA : ${stringify(usdBalanceOfMFA)}`);
            return {
                code: config.RESPONSE_CODES.SUCCESS,
                message: 'Converted all tokens successfully',
                swapHashMap: swapHashMap,
            }
        } catch (error: any) {
            log.error(error);
            throw error;
        }
    }

    async swapToNative(chainId: number, amount: string, tokenAddress: string): Promise<ethers.providers.TransactionResponse> {
        try {

            let routerAddress = config.uniswapRouterAddress[chainId];
            if (!routerAddress) {
                throw new Error(`Uniswap is not supported for network ${chainId}`);
            }
            let mfaPrivateKey = this.masterFundingAccount.getPublicKey()
            const networkService = this.transactionServiceMap[chainId].networkService;
            const addMinutes = (date: Date, minutes: number) => {
                const minuteAsMilliseconds = 60 * 1000; // 1m in ms
                return new Date(date.getTime() + (minutes * minuteAsMilliseconds));
            }

            const deadline = addMinutes(new Date(), 10000000);
            const epochDeadline = deadline.getTime();
            log.info(`epochDeadline: ${epochDeadline}`);

            let minimumAmountOut: ethers.BigNumber;
            const routerContract = this.transactionServiceMap[chainId].networkService.getContract(JSON.stringify(this.routerAbi), routerAddress);

            const weth = await routerContract.WETH();
            let expectedAmountOut;
            try {
                expectedAmountOut = await routerContract.getAmountsOut(amount, [tokenAddress, weth]);
                log.info(`expectedAmountOut: ${expectedAmountOut}`);
            } catch (error: any) {
                log.error(error);
                throw error;
            }

            minimumAmountOut = expectedAmountOut[1].mul(ethers.BigNumber.from(100).sub(10)).div(ethers.BigNumber.from(100));

            const data = routerContract.interface.encodeFunctionData("swapExactTokensForETH",
                [amount, minimumAmountOut, [tokenAddress, weth], mfaPrivateKey, epochDeadline]);
            const gasPriceEstimate = await networkService.getGasPrice();

            const transaction = {
                data,
                gasPrice: gasPriceEstimate.gasPrice,
                to: routerAddress,
                value: '0x0'
            };


            const gasLimit = await this.transactionServiceMap[chainId].networkService.estimateGas(
                routerContract,
                "swapExactTokensForETH",
                [amount, minimumAmountOut, [tokenAddress, weth], mfaPrivateKey, epochDeadline],
                mfaPrivateKey
            );

            const rawTransaction = {
                ...transaction,
                gasLimit: hexValue(gasLimit),
                from: mfaPrivateKey,
                chainId: chainId
            }

            let transactionId = await generateTransactionId(JSON.stringify(rawTransaction));
            log.info(`transactionId : ${transactionId}`);

            let swapResponse = await this.transactionServiceMap[chainId].sendTransaction(
                {
                    ...rawTransaction,
                    transactionId,
                    walletAddress: mfaPrivateKey,
                    speed: GasPriceType.FAST
                },
                this.masterFundingAccount,
                TransactionType.FUNDING,
                this.label
            );

            if (swapResponse.code === 200 && swapResponse.transactionExecutionResponse) {
                return swapResponse.transactionExecutionResponse
            }

            throw new Error(`Failed to swap token ${tokenAddress} on chainId: ${chainId} for amount ${amount}`);
        } catch (error: any) {
            log.error(`error : ${stringify(error)}`);
            throw error;
        }
    }


    async approveSpender(chainId: number, amount: BigNumber, tokenAddress: string): Promise<ethers.providers.TransactionResponse> {
        try {

            let routerAddress = config.uniswapRouterAddress[chainId];
            if (!routerAddress) {
                throw new Error(`Uniswap is not supported for network ${chainId}`);
            }
            let mfaPrivateKey = this.masterFundingAccount.getPublicKey()

            const networkService = this.transactionServiceMap[chainId].networkService;
            const erc20Contract = networkService.getContract(config.erc20Abi, tokenAddress);

            const data = erc20Contract.interface.encodeFunctionData("approve", [routerAddress, config.INFINITE_APPROVAL_AMOUNT]);
            const gasPriceEstimate = await networkService.getGasPrice();

            const transaction = {
                data,
                gasPrice: gasPriceEstimate.gasPrice,
                to: tokenAddress,
                value: '0x0'
            };

            const gasLimit = await this.transactionServiceMap[chainId].networkService.estimateGas(
                erc20Contract,
                "approve",
                [routerAddress, config.INFINITE_APPROVAL_AMOUNT],
                mfaPrivateKey
            );

            const rawTransaction = {
                ...transaction,
                gasLimit: hexValue(gasLimit),
                from: mfaPrivateKey,
                chainId: chainId
            }

            let transactionId = await generateTransactionId(JSON.stringify(rawTransaction));
            log.info(`transactionId : ${transactionId}`);

            let approveResponse = await this.transactionServiceMap[chainId].sendTransaction(
                {
                    ...rawTransaction,
                    transactionId,
                    walletAddress: mfaPrivateKey,
                    speed: GasPriceType.FAST
                },
                this.masterFundingAccount,
                TransactionType.FUNDING,
                this.label
            );

            if (approveResponse.code === 200 && approveResponse.transactionExecutionResponse) {
                return approveResponse.transactionExecutionResponse
            }
            throw new Error(`Failed to approve token ${tokenAddress} on chainId: ${chainId} for amount ${amount}`);
        } catch (error: any) {
            log.error(`error : ${stringify(error)}`);
            throw error;
        }
    }

    swapToken(route: RouteParams): Promise<ethers.providers.TransactionResponse> {
        throw new Error('Method not implemented.');
    }

    async checkDexAllowance(fromChainId: number, tokenAddress: string): Promise<BigNumber> {
        try {
            let routerAddress = config.uniswapRouterAddress[fromChainId];
            if (!routerAddress) {
                throw new Error(`Uniswap is not supported for network ${fromChainId}`);
            }
            const erc20Contract = this.transactionServiceMap[fromChainId].networkService.getContract(config.erc20Abi, tokenAddress);
            const allowance: ethers.BigNumber = await erc20Contract.allowance(this.masterFundingAccount.getPublicKey(), routerAddress);
            return allowance;
        } catch (error: any) {
            log.error(`error : ${stringify(error)}`);
            throw error;
        }
    }

    getSwapCost(swapCostParams: SwapCostParams): Promise<BigNumber> {
        throw new Error('Method not implemented.');
    }

    initialiseSwapTokenList(chainId: number): void {
        log.info("No need to initialise token list")
    }

    getQuote(quoteRequestParam: QuoteRequestParam) {
        throw new Error('Method not implemented.');
    }
}
