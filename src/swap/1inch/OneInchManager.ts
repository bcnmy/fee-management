import { BigNumber, ethers } from "ethers";
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

    oneInchTokenMap: Record<number, Record<string, string>> = {};
    masterFundingAccount: IEVMAccount;
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
    cacheService: ICacheService;

    constructor(_masterFundingAccount: IEVMAccount,
        _transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>, _cacheService: ICacheService) {
        this.cacheService = _cacheService;
        this.masterFundingAccount = _masterFundingAccount;
        this.transactionServiceMap = _transactionServiceMap;
    }

    async initialiseSwapTokenList(chainId: number): Promise<void> {
        try {

            const getOneInchListFromCache = await this.cacheService.get(getOneInchTokenListKey(chainId));

            if (getOneInchListFromCache) {
                this.oneInchTokenMap[chainId] = JSON.parse(getOneInchListFromCache);
            } else {
                log.info(`getSupportedTokenList() chainId: ${chainId} `);
                const supportedTokenurl = this.apiRequestUrl('/tokens', chainId, null);

                log.info(`supportedTokenurl: ${supportedTokenurl} `);
                const response = await fetch(supportedTokenurl)
                    .then((res: any) => res.json())
                    .then((res: any) => res);

                let tokenList: Record<string, string> = {};
                for (let tokenAddress in response.tokens) {
                    let symbol = response.tokens[tokenAddress].symbol;
                    tokenList[symbol] = tokenAddress;
                }
                this.oneInchTokenMap[chainId] = tokenList

                await this.cacheService.set(getOneInchTokenListKey(chainId), JSON.stringify(tokenList));
                await this.cacheService.expire(getOneInchTokenListKey(chainId), config.oneInchTokenListExpiry);
            }
        } catch (error: any) {
            log.error(error);
            throw error;
        }
    }

    async checkDexAllowane(chainId: number, tokenAddress: string): Promise<BigNumber> {
        return fetch(this.apiRequestUrl('/approve/allowance', chainId, { tokenAddress, walletAddress: this.masterFundingAccount.getPublicKey() }))
            .then((res: any) => res.json())
            .then((res: any) => res.allowance);
    }

    async approveSpender(chainId: number, amount: BigNumber, tokenAddress: string, label: string): Promise<ethers.providers.TransactionResponse> {

        let mfaPrivateKey = this.masterFundingAccount.getPublicKey()
        const url = this.apiRequestUrl('/approve/transaction', chainId, { tokenAddress, amount });

        const transaction = await fetch(url).then((res: any) => res.json());

        const gasLimit = await this.transactionServiceMap[chainId].networkService.ethersProvider.estimateGas({
            ...transaction,
            from: this.masterFundingAccount.getPublicKey()
        });

        const rawTransaction: RawTransactionParam = {
            ...transaction,
            value: BigNumber.from(transaction.value)._hex,
            gasLimit: gasLimit,
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
            TransactionType.SCW,
            label
        );

        if (approveResponse.code === 200 && approveResponse.transactionExecutionResponse) {
            return approveResponse.transactionExecutionResponse
        }
        throw new Error(`Failed to approve token ${tokenAddress} on chainId: ${chainId} for amount ${amount}`);
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