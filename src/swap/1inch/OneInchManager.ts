import { BigNumber, ethers } from "ethers";
import { hexValue } from "ethers/lib/utils";
import { config } from "../../config";
import { log } from "../../logs";
import { ICacheService } from "../../relayer-node-interfaces/ICacheService";
import { IEVMAccount } from "../../relayer-node-interfaces/IEVMAccount";
import { ITransactionService } from "../../relayer-node-interfaces/ITransactionService";
import { EVMRawTransactionType, GasPriceType, QuoteRequestParam, RawTransactionParam, SwapCostParams, TransactionType } from "../../types";
import { getOneInchTokenListKey } from "../../utils/cache-utils";
import { generateTransactionId } from "../../utils/common-utils";

const fetch = require('node-fetch');

export class OneInchManager {

    masterFundingAccount: IEVMAccount;
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
    cacheService: ICacheService;

    constructor(_masterFundingAccount: IEVMAccount,
        _transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>, _cacheService: ICacheService) {
        this.cacheService = _cacheService;
        this.masterFundingAccount = _masterFundingAccount;
        this.transactionServiceMap = _transactionServiceMap;
    }

    async checkDexAllowance(chainId: number, tokenAddress: string): Promise<BigNumber> {
        try {
            return fetch(this.apiRequestUrl('/approve/allowance', chainId, { tokenAddress, walletAddress: this.masterFundingAccount.getPublicKey() }))
                .then((res: any) => res.json())
                .then((res: any) => res.allowance);
        } catch {
            throw new Error(`Error while getting the Allowance for token ${tokenAddress} on chain ${chainId}`);
        }
    }

    async approveSpender(chainId: number, amount: BigNumber, tokenAddress: string, label: string): Promise<ethers.providers.TransactionResponse> {
        try {
            let mfaPrivateKey = this.masterFundingAccount.getPublicKey()
            const url = this.apiRequestUrl('/approve/transaction', chainId, { tokenAddress, amount });

            const transaction = await fetch(url).then((res: any) => res.json());

            const gasLimit = await this.transactionServiceMap[chainId].getNetworkServiceInstance().getEthersProvider().estimateGas({
                ...transaction,
                from: this.masterFundingAccount.getPublicKey()
            });

            const rawTransaction: RawTransactionParam = {
                ...transaction,
                value: BigNumber.from(transaction.value)._hex,
                gasLimit: hexValue(gasLimit),
                from: mfaPrivateKey,
                chainId: chainId,
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
                label
            );

            if (approveResponse && approveResponse.code === 200 && approveResponse.transactionExecutionResponse) {
                return approveResponse.transactionExecutionResponse
            }
            throw new Error(`Failed to approve token ${tokenAddress} on chainId: ${chainId} for amount ${amount}`);
        } catch (error: any) {
            log.error(error);
            throw error;
        }
    }

    apiRequestUrl(methodName: string, chainId: number, queryParams: any): string {
        return config.oneInchApiBaseUrl + chainId + methodName + '?' + new URLSearchParams(queryParams).toString();
    }

    getSwapCost(swapCostParams: SwapCostParams): Promise<ethers.BigNumber> {
        throw new Error('Method not implemented.');
    }
    getQuote(quoteRequestParam: QuoteRequestParam) {
        throw new Error('Method not implemented.');
    }
}