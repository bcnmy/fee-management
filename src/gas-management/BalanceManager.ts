import { BigNumber, ethers } from "ethers";
import { config } from "../config";
import { log } from "../logs";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { EVMRawTransactionType } from "../types";
import { stringify } from "../utils/common-utils";

export class BalanceManager {
    masterFundingAccount: IEVMAccount;
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>

    constructor(_masterFundingAccount: IEVMAccount, transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>) {
        this.masterFundingAccount = _masterFundingAccount;
        this.transactionServiceMap = transactionServiceMap;
    }

    async getBalance(chainId: number, tokenAddress: string): Promise<BigNumber> {
        let tokenBalance: BigNumber;
        let mfaPublicKey = this.masterFundingAccount.getPublicKey();
        try {
            log.info(`tokenAddress: ${tokenAddress}`);
            if (tokenAddress === config.NATIVE_ADDRESS_RELAYER || tokenAddress === config.NATIVE_ADDRESS_ROUTER) {
                tokenBalance = await this.transactionServiceMap[chainId].networkService.getBalance(
                    mfaPublicKey
                );

            } else {
                let tokenBalanceFromChain = await this.transactionServiceMap[chainId].networkService.executeReadMethod(
                    config.erc20Abi,
                    tokenAddress,
                    'balanceOf',
                    [mfaPublicKey]
                );

                tokenBalance = ethers.BigNumber.from(tokenBalanceFromChain);
            }

            log.info(`MFA ${mfaPublicKey} balance for token ${tokenAddress} is: ${tokenBalance.toString()}`);
        } catch (error: any) {
            log.error(stringify(error.message ? error.message : error));
            throw new Error(`Error while fetching MFA ${mfaPublicKey} balance for token ${tokenAddress} on chain ${chainId}: ${stringify(error)}`);
        }

        return tokenBalance;
    }

    calculateMFABalanceInUSD(): Promise<Record<number, number>> {
        throw new Error('Method not implemented.');
    }
}