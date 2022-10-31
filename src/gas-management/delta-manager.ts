// import "{ } from "./types";
import { ICacheService } from "../relayer-node-interfaces/ICacheService";
import { ITokenPrice } from "../relayer-node-interfaces/ITokenPrice";
import { AppConfig, DeltaManagerParams, DeltaMap, EVMRawTransactionType, MasterFundingAccount, TokenData } from "../types";
import { IDeltaManager } from "./interfaces/IDeltaManager";
import { BigNumber, ethers } from "ethers";
import { getErc20TokenBalance, getNativeTokenBalance } from "../utils/token-utils";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { config, NATIVE_ADDRESS } from "../config";
import { IBalanceManager } from "./interfaces/IBalanceManager";
class DeltaManager implements IDeltaManager {

    cacheService: ICacheService;
    masterFundingAccount: MasterFundingAccount;
    tokenList: Record<number, TokenData[]>;
    appConfig: AppConfig;
    tokenPriceService: ITokenPrice;
    providerMap: Record<number, ethers.providers.JsonRpcProvider>;
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
    balanceManager: IBalanceManager;

    constructor(deltaManagerParams: DeltaManagerParams) {
        this.cacheService = deltaManagerParams.cacheService;
        this.masterFundingAccount = deltaManagerParams.masterFundingAccount;
        this.tokenList = deltaManagerParams.tokenList;
        this.appConfig = deltaManagerParams.appConfig;
        this.tokenPriceService = deltaManagerParams.tokenPriceService;
        this.transactionServiceMap = deltaManagerParams.transactionServiceMap;
        this.balanceManager = deltaManagerParams.balanceManager;
    }
    async calculateDelta(mfaUSDBalanceMap: Map<number, number>, chainToRebalance: number): Promise<DeltaMap> {

        let positiveDeltaMap; // chains where funds are below Initial Funding Amount
        let negativeDeltaMap; // chains where funds are above Initial Funding Amount
        try{
            for (let chainId in mfaUSDBalanceMap) {
                let deltaValue = this.appConfig.InitialFundingAmountInUsd[chainId] - mfaUSDBalanceMap[chainId];
                if(deltaValue > 0 && chainId === chainToRebalance.toString() ){
                    positiveDeltaMap[chainId] += deltaValue;
                } else if ( deltaValue < 0){
                    negativeDeltaMap[chainId] += deltaValue
                }
            }
        } catch(error) {
            throw new Error(`Error while calculating chainwise Delta ${JSON.stringify(error)}`);
        }
        return { 
            positiveDeltaMap: positiveDeltaMap, 
            negativeDeltaMap: negativeDeltaMap
        };
    }

    async calculateMFABalanceInUSD(): Promise<Map<number, number>> {

        let usdBalanceOfMFA: Map<number, number> = new Map();

        try{
            for (let chainId in this.tokenList) {
                for (let tokenRecordIndex = 0; tokenRecordIndex < this.tokenList[chainId].length; tokenRecordIndex++) {
                    try{
                        console.log(this.tokenList[chainId][tokenRecordIndex].address);
                        let tokenBalance = await this.balanceManager.getBalance(Number(chainId), this.tokenList[chainId][tokenRecordIndex].address.toLowerCase());
                        
                        let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(this.tokenList[chainId][tokenRecordIndex].symbol);
                        let balanceValueInUsd = tokenBalance.mul(tokenUsdPrice);
        
                        usdBalanceOfMFA[chainId] =+ balanceValueInUsd;
                    } catch (error){
                        throw new Error(`Error while calculating token usdBalance in MFA for chainId ${chainId}`)
                    }
                }
            }
        } catch (error){
            throw new Error(`Error while calculating usdBalance in MFA ${JSON.stringify(error)}`);
        }
        return usdBalanceOfMFA;
    }
}

export { DeltaManager }