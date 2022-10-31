// import "{ } from "./types";
import { BigNumber, ethers } from "ethers";
import { config, NATIVE_ADDRESS } from "../config";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { EVMRawTransactionType, BalanceManagerParams } from "../types";
import { IBalanceManager } from "./interfaces/IBalanceManager";

class BalanceManager implements IBalanceManager {
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
    masterFundingAccount: any;

    constructor( balanceManagerParams: BalanceManagerParams ){
        this.transactionServiceMap = balanceManagerParams.transactionServiceMap;
        this.masterFundingAccount = balanceManagerParams.masterFundingAccount;
    }

    async getBalance(chainId: number, tokenAddress: string): Promise<BigNumber> {
        let tokenBalance: BigNumber;
        try {
            if(tokenAddress === NATIVE_ADDRESS){
                tokenBalance = await this.transactionServiceMap[chainId].networkService.getBalance(this.masterFundingAccount.publicAddress);
            } else {
                let readBalanceFromChain = await this.transactionServiceMap[chainId].networkService.executeReadMethod(
                    config.erc20Abi,
                    tokenAddress,
                    "balanceOf",
                    [this.masterFundingAccount.publicAddress] 
                );

                tokenBalance = ethers.BigNumber.from(readBalanceFromChain);
            }
        } catch(error){
            throw new Error(`Error while fetching token ${tokenAddress} balance on chain ${chainId}`);
        }

        return tokenBalance;
    }
}

export { BalanceManager }