import { MasterFundingAccount, TokenData, AppConfig, FeeManagerParams, EVMRawTransactionType} from "./types";
import { config, SIGNATURE_TYPES, RESPONSE_CODES, EXIT_STATUS, FEE_CONVERSION_DB_STATUSES } from "./config";
import { IDBService } from "./relayer-node-interfaces/IDBService";
import { ICacheService } from "./relayer-node-interfaces/ICacheService";
import { ITokenPrice } from "./relayer-node-interfaces/ITokenPrice";
import { Mongoose } from 'mongoose';
import { log } from "./logs";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { getGasFeePaidKey } from "./utils/cache-utils";
import { getTimeInMilliseconds } from "./utils/common-utils";
import { getTokenInfo } from "./utils/token-utils";
import { ethers } from "ethers";
import {AccumulatedFeeDAO} from "./mongo/dao";
import { DeltaManager } from "./gas-management/delta-manager";
import { IDeltaManager } from "./gas-management/interfaces/IDeltaManager";
import { ITransactionService } from "./relayer-node-interfaces/ITransactionService";
import { IEVMAccount } from "./relayer-node-interfaces/IEVMAccount";
import { IPathManager } from "./gas-management/interfaces/IPathManager";
import { PathManager } from "./gas-management/path-manager";
import { ISwapManager } from "./swap/interfaces/ISwapManager";
import { IBridgeService } from "./bridge/interfaces/IBridgeService";
import { OneInchManager } from "./swap/1inch/1Inch-manager";
import { HyphenBridge } from "./bridge/hyphen-bridge";
import { IBalanceManager } from "./gas-management/interfaces/IBalanceManager";
import { BalanceManager } from "./gas-management/balance-manager";
import { INetwork } from "./blockchain/interface/INetwork";
import { Network } from "./blockchain/network";

class FeeManager {
    masterFundingAccount: MasterFundingAccount;
    relayerAddresses: String[];
    tokenList: Record<number, TokenData[]>;
    appConfig: AppConfig;
    dbService: IDBService<Mongoose | null>;
    tokenPriceService: ITokenPrice;
    cacheService: ICacheService;
    GDR: JSON;
    accumulatedFeeDao: AccumulatedFeeDAO;
    deltaManager: IDeltaManager;
    pathManager: IPathManager;
    swapManager: ISwapManager;
    bridgeService: IBridgeService;
    balanceManager: IBalanceManager;
    networkMap: Record<number, INetwork>;
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
    oneIncheTokenMap: Record<number, Record<string, string>> 
    hyphenSupportedTokenMap: Record<number, TokenData>

    constructor( feeManagerParams: FeeManagerParams) {

        this.transactionServiceMap = feeManagerParams.transactionServiceMap;

        for(let chainId in this.transactionServiceMap){
            let network = new Network({
                provider: this.transactionServiceMap[chainId].networkService.ethersProvider,
                liquidityPoolAddress: config.hyphenLiquidityPoolAddress[chainId]
            })
            this.networkMap[chainId] = network;
        }

        this.swapManager = new OneInchManager();
        this.masterFundingAccount = feeManagerParams.masterFundingAccount;
        this.relayerAddresses = feeManagerParams.relayerAddresses;
        this.tokenList = feeManagerParams.tokenList;
        this.appConfig = feeManagerParams.appConfig;
        
        this.dbService = feeManagerParams.dbService;
        this.dbService.connect();       // Initialize db connection
        this.tokenPriceService = feeManagerParams.tokenPriceService;
        this.cacheService = feeManagerParams.cacheService;
        this.accumulatedFeeDao = new AccumulatedFeeDAO();
        this.balanceManager = new BalanceManager({
            transactionServiceMap: this.transactionServiceMap,
            masterFundingAccount: this.masterFundingAccount
        });
        this.deltaManager = new DeltaManager({
            cacheService: this.cacheService,
            masterFundingAccount: this.masterFundingAccount,
            tokenList: this.tokenList,
            appConfig: this.appConfig,
            tokenPriceService: this.tokenPriceService,
            transactionServiceMap: this.transactionServiceMap,
            balanceManager: this.balanceManager,
        });

        this.bridgeService = new HyphenBridge({
            transactionServiceMap: this.transactionServiceMap,
            networkMap: this.networkMap,
            tokenPriceService: this.tokenPriceService,
            masterFundingAccount: this.masterFundingAccount
        });

        this.pathManager = new PathManager({
            swapManager: this.swapManager,
            bridgeService: this.bridgeService,
            masterFundingAccount: this.masterFundingAccount,
            tokenList: this.tokenList,
            appConfig: this.appConfig,
            tokenPriceService: this.tokenPriceService,
            transactionServiceMap: this.transactionServiceMap,
            balanceManager: this.balanceManager
        })
    }

    async init(){
        for(let chainId in this.transactionServiceMap){
            let hyphenSupportedTokens = await this.bridgeService.getHyphenSupportedToken(Number(chainId));
            this.hyphenSupportedTokenMap[chainId] = hyphenSupportedTokens

            let oneInchSupportedTokens = await this.swapManager.getSupportedTokenList(Number(chainId));
            this.oneIncheTokenMap[chainId] = oneInchSupportedTokens;
        }

        await this.pathManager.setHyphenSupportedTokenMap(this.hyphenSupportedTokenMap);
        await this.pathManager.setOneInchSupportedTokenMap(this.oneIncheTokenMap);
    }

    async onTransaction(transactionResponse:  TransactionResponse, chainId: number ){
        try {
            if(transactionResponse.gasPrice) {
                /** Get the transaction GasPrice
                * check in DB if already an entry, if yes, update currentValueFromDB + incomingGasFee, in DB
                * Check key in cache, if available, update cacheValue + incomingGasFee, in cache 
                * if not, create a new entry with PENDING status with incomingGasFee
                * set value in cache with incomingGasFee as value
                */

                let transactionFeePaidInNative = transactionResponse.gasPrice;
                let tokenInfo = getTokenInfo(chainId, this.tokenList);
                if( !tokenInfo ) {
                    throw new Error(`TokenInfo not Available`);
                }
                let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(tokenInfo.symbol);
                let transactionFeePaidInUsd = transactionFeePaidInNative.mul(tokenUsdPrice).div(tokenInfo.decimal);

                let totalFeePaidFromDb = await this.accumulatedFeeDao.getOne({chainId, status: "PENDING"});

                if(totalFeePaidFromDb && totalFeePaidFromDb.accumulatedFeeData){
                    let nativeFeeToBeUpdatedInDB = transactionFeePaidInNative.add(totalFeePaidFromDb.accumulatedFeeData.feeAccumulatedInNative);
                    let feeInUsdToBeUpdatedInDB = transactionFeePaidInUsd.add(totalFeePaidFromDb.accumulatedFeeData.feeAccumulatedInUSD);
                    
                    let updateAccumulatedFeeRequest = await this.accumulatedFeeDao.update({ 
                        feeAccumulatedInNative: nativeFeeToBeUpdatedInDB,
                        feeAccumulatedInUSD: feeInUsdToBeUpdatedInDB,
                        updatedOn: getTimeInMilliseconds()
                    }, totalFeePaidFromDb.accumulatedFeeData._id);
                    await this.cacheService.set(getGasFeePaidKey(chainId), feeInUsdToBeUpdatedInDB.toString());

                    // Add Cache lock inside this to avoid multiple executions
                    if( feeInUsdToBeUpdatedInDB.gt(ethers.BigNumber.from(this.appConfig.feeSpendThreshold[chainId])) ) {
                        let mfaUSDBalanceMap = await this.deltaManager.calculateMFABalanceInUSD();
                        let deltaMap = await this.deltaManager.calculateDelta(mfaUSDBalanceMap, chainId);

                        let routesMap = await this.pathManager.findAllRoutes(deltaMap, chainId);
                    }
                } else {
                    let addAccumulatedFeeToDBRequest = await this.accumulatedFeeDao.add({ 
                        startTime: getTimeInMilliseconds(),
                        feeAccumulatedInNative: transactionFeePaidInNative,
                        feeAccumulatedInUSD: transactionFeePaidInUsd,
                        tokenSymbol: tokenInfo.symbol,
                        network: chainId,
                        status: FEE_CONVERSION_DB_STATUSES.PEDNING,
                        createdOn: getTimeInMilliseconds(),
                    });
                    await this.cacheService.set(getGasFeePaidKey(chainId), transactionFeePaidInUsd.toString());   
                }
            } else {
                log.info("Receipt not found");
                throw new Error(`Receipt not found`);
            }
            // check gas cpuUsage
            // if(used>threshold){
            //     calculateGDR()
            //     calculateDelta()
            //     sort()
            //     execute()
                
            // }
        } catch (error) {
            throw error;
        }
        
    }
}

export { FeeManager, RESPONSE_CODES, SIGNATURE_TYPES, EXIT_STATUS }