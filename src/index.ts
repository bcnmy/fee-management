import { MasterFundingAccount, TokenList , rpcUrlMap} from "./types";
import { SIGNATURE_TYPES, RESPONSE_CODES, EXIT_STATUS, FEE_CONVERSION_DB_STATUSES } from "./config";
import { IDBService } from "./relayer-node-interfaces/IDBService";
import { ICacheService } from "./relayer-node-interfaces/ICacheService";
import { ITokenPrice } from "./relayer-node-interfaces/ITokenPrice";
import { Mongoose } from 'mongoose';
import { log } from "./logs";
import {
    Block, BlockTag, BlockWithTransactions, EventType, Filter, FilterByBlockHash, ForkEvent,
    Listener, Log, Provider, TransactionReceipt, TransactionRequest, TransactionResponse
} from "@ethersproject/abstract-provider";
import { getGasFeePaidKey } from "./utils/cache-utils";
import { getTimeInMilliseconds } from "./utils/common-utils";
import { ethers } from "ethers";
import {AccumulatedFeeDAO} from "./mongo/dao";
/****** */
// Assigning some default value for testing purpose only

/******* */
class FeeManager {
    rpcUrlMap: rpcUrlMap;
    masterFundingAmount: MasterFundingAccount;
    relayerAddresses: String[];
    tokenList: TokenList[];
    config: any;
    dbService: IDBService<Mongoose | null>;
    tokenPriceService: ITokenPrice;
    cacheService: ICacheService;
    GDR: JSON;
    accumulatedFeeDao: AccumulatedFeeDAO;

    constructor( initialParams: any) {
        this.rpcUrlMap = initialParams.rpcUrlMap;
        this.masterFundingAmount = initialParams.masterFundingAmount;
        this.relayerAddresses = initialParams.relayerAddresses;
        this.tokenList = initialParams.tokenList;
        this.config = initialParams.config;
        
        this.dbService = initialParams.dbService;
        this.dbService.connect();       // Initialize db connection
        this.tokenPriceService = initialParams.tokenPriceService;
        this.cacheService = initialParams.cacheService;
        this.accumulatedFeeDao = new AccumulatedFeeDAO();
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
                let transactionFeePaid = transactionResponse.gasPrice;
                let totalFeePaidFromDb = await this.accumulatedFeeDao.getOne({chainId, status: "PENDING"});
                let gasUsed = transactionFeePaid.add(totalFeePaidFromDb.accumulatedFeeData.feeAccumulated);
                if(totalFeePaidFromDb && totalFeePaidFromDb.accumulatedFeeData){
                    let updateAccumulatedFeeRequest = await this.accumulatedFeeDao.update({ 
                        feeAccumulated: gasUsed,
                        updatedOn: getTimeInMilliseconds()
                    }, totalFeePaidFromDb.accumulatedFeeData._id);
                    await this.cacheService.set(getGasFeePaidKey(chainId), gasUsed.toString());

                    /** If Value got from db is greater then threshold */
                    if(gasUsed > this.config.gasUsedThreshold[chainId]) {
                        // TODO do rebalancing
                    }

                } else {
                    let addAccumulatedFeeToDBRequest = await this.accumulatedFeeDao.add({ 
                        startTime: getTimeInMilliseconds(),
                        feeAccumulated: transactionFeePaid,
                        network: chainId,
                        status: FEE_CONVERSION_DB_STATUSES.PEDNING,
                        createdOn: getTimeInMilliseconds(),
                    });
                    await this.cacheService.set(getGasFeePaidKey(chainId), transactionFeePaid.toString());   
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