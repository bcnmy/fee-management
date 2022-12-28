import {
  AppConfig,
  FeeManagerParams,
  EVMRawTransactionType,
  RouteParams,
  Mode,
} from './types';
import { config } from './config';
import { ICacheService } from './relayer-node-interfaces/ICacheService';
import { ITokenPrice } from './relayer-node-interfaces/ITokenPrice';
import { log } from './logs';
import { getAccumulatedFeeObjKey, getGasFeePaidKey } from './utils/cache-utils';
import { getTimeInMilliseconds, stringify } from './utils/common-utils';
import * as tokenUtils from './utils/token-utils';
import { ethers } from 'ethers';
import { AccumulatedFeeDAO } from './mongo/dao';
import { DeltaManager } from './gas-management/DeltaManager';
import { IDeltaManager } from './gas-management/interfaces/IDeltaManager';
import { ITransactionService } from './relayer-node-interfaces/ITransactionService';
import { IEVMAccount } from './relayer-node-interfaces/IEVMAccount';
import { IPathManager } from './gas-management/interfaces/IPathManager';
import { PathManager } from './gas-management/PathManager';
import { ISwapManager } from './swap/interfaces/ISwapManager';
import { IBridgeService } from './bridge/interfaces/IBridgeService';
import { CrossChainSwapManager } from './swap/1inch/CrossChainSwapManager';
import { HyphenBridge } from './bridge/hyphen-bridge';
import { IBalanceManager } from './gas-management/interfaces/IBalanceManager';
import { CrossChainBalanceManager } from './gas-management/CrossChainBalanceManager';
import { Lock } from 'redlock';
import { SingleChainBalanceManager } from './gas-management/SingleChainBalanceManager';
import { SingleChainSwapManager } from './swap/1inch/SingleChainSwapManager';
import { Mongo } from './mongo/Mongo';

class FeeManager {
  masterFundingAccount!: IEVMAccount;
  relayerAddresses!: String[];
  appConfig!: AppConfig;
  tokenPriceService!: ITokenPrice;
  cacheService!: ICacheService;
  accumulatedFeeDao!: AccumulatedFeeDAO;
  deltaManager!: IDeltaManager;
  pathManager!: IPathManager;
  swapManager!: ISwapManager;
  bridgeServiceMap: Record<number, IBridgeService> = {};
  balanceManager!: IBalanceManager;
  transactionServiceMap!: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  oneInchTokenMap: Record<number, Record<string, string>> = {};
  hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>> = {};

  constructor(feeManagerParams: FeeManagerParams) {
    try {
      if (this.validateParams(feeManagerParams)) {

        this.masterFundingAccount = feeManagerParams.masterFundingAccount;

        this.transactionServiceMap = feeManagerParams.transactionServiceMap;

        this.relayerAddresses = feeManagerParams.relayerAddresses;

        this.appConfig = feeManagerParams.appConfig;

        const dbInstance = Mongo.getInstance(feeManagerParams.dbUrl);
        dbInstance.connect();

        this.tokenPriceService = feeManagerParams.tokenPriceService;

        this.cacheService = feeManagerParams.cacheService;
        // this.cacheService.connect();

        this.accumulatedFeeDao = new AccumulatedFeeDAO();

        if (feeManagerParams.mode === Mode.SINGLE_CHAIN) {
          this.balanceManager = new SingleChainBalanceManager({
            transactionServiceMap: this.transactionServiceMap,
            masterFundingAccount: this.masterFundingAccount,
            tokenList: this.appConfig.tokenList,
            tokenPriceService: this.tokenPriceService,
          });

          this.swapManager = new SingleChainSwapManager({
            cacheService: this.cacheService,
            tokenPriceService: this.tokenPriceService,
            transactionServiceMap: this.transactionServiceMap,
            masterFundingAccount: this.masterFundingAccount,
            balanceManager: this.balanceManager,
            appConfig: this.appConfig,
            label: feeManagerParams.label
          });
        } else if (feeManagerParams.mode === Mode.CROSS_CHAIN) {
          this.balanceManager = new CrossChainBalanceManager({
            transactionServiceMap: this.transactionServiceMap,
            masterFundingAccount: this.masterFundingAccount,
            tokenList: this.appConfig.tokenList,
            tokenPriceService: this.tokenPriceService
          });

          this.swapManager = new CrossChainSwapManager({
            cacheService: this.cacheService,
            tokenPriceService: this.tokenPriceService,
            masterFundingAccount: this.masterFundingAccount,
            transactionServiceMap: this.transactionServiceMap,
            balanceManager: this.balanceManager,
            appConfig: this.appConfig,
            label: feeManagerParams.label
          });
        }

        this.deltaManager = new DeltaManager({
          cacheService: this.cacheService,
          masterFundingAccount: this.masterFundingAccount,
          appConfig: this.appConfig,
          transactionServiceMap: this.transactionServiceMap,
          balanceManager: this.balanceManager,
        });

        for (let chainId in this.transactionServiceMap) {
          let bridgeService = new HyphenBridge({
            appConfig: this.appConfig,
            cacheService: this.cacheService,
            transactionService: this.transactionServiceMap[chainId],
            liquidityPoolAddress: this.appConfig.hyphenLiquidityPoolAddress[chainId],
            tokenPriceService: this.tokenPriceService,
            masterFundingAccount: this.masterFundingAccount,
          });
          this.bridgeServiceMap[chainId] = bridgeService;
        }

        this.pathManager = new PathManager({
          swapManager: this.swapManager,
          bridgeServiceMap: this.bridgeServiceMap,
          masterFundingAccount: this.masterFundingAccount,
          tokenList: this.appConfig.tokenList,
          appConfig: this.appConfig,
          tokenPriceService: this.tokenPriceService,
          transactionServiceMap: this.transactionServiceMap,
          balanceManager: this.balanceManager,
        });
        log.info(`Fee Manager Params Initiated successfully`);
      } else {
        log.info(`SDK initialisation failed`);
      }
    } catch (error) {
      throw error;
    }
  }
  validateParams(feeManagerParams: FeeManagerParams): Boolean {
    if (feeManagerParams) {
      if (feeManagerParams.masterFundingAccount === null || feeManagerParams.masterFundingAccount === undefined) {
        log.info(`masterFundingAccount is not defined`);
        throw new Error(`masterFundingAccount is not defined`);
      }
      if (feeManagerParams.relayerAddresses === null || feeManagerParams.relayerAddresses === undefined) {
        log.info(`relayerAddresses is not defined`);
        throw new Error(`relayerAddresses is not defined`);
      }
      if (feeManagerParams.appConfig === null || feeManagerParams.appConfig === undefined) {
        log.info(`appConfig is not defined`);
        throw new Error(`appConfig is not defined`);
      }
      if (feeManagerParams.dbUrl === null || feeManagerParams.dbUrl === undefined) {
        log.info(`dbUrl is not defined`);
        throw new Error(`dbUrl is not defined`);
      }
      if (feeManagerParams.tokenPriceService === null || feeManagerParams.tokenPriceService === undefined) {
        log.info(`tokenPriceService is not defined`);
        throw new Error(`tokenPriceService is not defined`);
      }
      if (feeManagerParams.cacheService === null || feeManagerParams.cacheService === undefined) {
        log.info(`cacheService is not defined`);
        throw new Error(`cacheService is not defined`);
      }
      if (feeManagerParams.transactionServiceMap === null || feeManagerParams.transactionServiceMap === undefined) {
        log.info(`transactionServiceMap is not defined`);
        throw new Error(`transactionServiceMap is not defined`);
      }
      if (feeManagerParams.label === null || feeManagerParams.label === undefined) {
        log.info(`label is not defined`);
        throw new Error(`label is not defined`);
      }
      return true;
    } else {
      throw new Error(`feeManagerParams not defined`);
    }
  }

  async init() {
    try {
      for (let chainId in this.transactionServiceMap) {
        await this.bridgeServiceMap[chainId].initializeBridgeTokenList(Number(chainId));
        await this.swapManager.initialiseSwapTokenList(Number(chainId));
      }

    } catch (error: any) {
      log.error(error);
      log.info(`Error while initiating token list`);
      throw new Error(`Error while initiating token list`);
    }
  }
  /** Get the transaction GasPrice
     * check in DB if already an entry, if yes, update currentValueFromDB + incomingGasFee, in DB
     * Check key in cache, if available, update cacheValue + incomingGasFee, in cache
     * if not, create a new entry with PENDING status with incomingGasFee
     * set value in cache with incomingGasFee as value
     * if yes, add gasPrice and update db & cache
     * Check if gasFeeSpend > threshold, then its time for convert erc20 tokens to native currency
     */

  async onTransactionSCW(transactionHash: string, chainId: number) {

    // async onTransactionSCW(transactionReceipt: ethers.providers.TransactionReceipt, chainId: number) {

    let transactionReceipt: ethers.providers.TransactionReceipt = await this.transactionServiceMap[chainId].networkService.waitForTransaction(transactionHash);
    if (!transactionReceipt) {
      throw new Error(`Transaction Receipt is undefined`);
    }
    let redisLock: Lock | undefined;
    let mfaPublicKey: string = this.masterFundingAccount.getPublicKey();
    try {
      if (transactionReceipt.gasUsed) {
        let nativeTokenInfo = tokenUtils.getNativeTokenInfo(chainId, this.appConfig.tokenList);
        if (!nativeTokenInfo) {
          log.error(`native Token Info not Available`);
          throw new Error(`Native Token Info not Available for chain id ${chainId}`);
        }
        let networkGasPrice = await this.transactionServiceMap[chainId].networkService.getGasPrice();
        log.info(`networkGasPrice: ${stringify(networkGasPrice)}`);

        let transactionFee = transactionReceipt.gasUsed.mul(networkGasPrice.gasPrice);
        log.info(`transactionFee: ${transactionFee}`);

        let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(nativeTokenInfo.symbol);
        log.info(`tokenUsdPrice: ${tokenUsdPrice}`);

        let transactionFeePaidInUsd = parseFloat((transactionFee.mul(tokenUsdPrice)).toString()) / Math.pow(10, nativeTokenInfo.decimal);
        log.info(`transactionFeePaidInUsd: ${transactionFeePaidInUsd}`);

        // TODO: Sachin: Take the redis db lock here before quering the DB - done
        log.info(`trying to acquire lock for chainId ${chainId} and masterFundingAccount ${mfaPublicKey}`);
        if (!this.cacheService || !this.cacheService.getRedLock()) {
          throw new Error("Error while getting Redlock instance");
        }
        redisLock = await this.cacheService.getRedLock()?.acquire([`locks:${chainId}_${mfaPublicKey}_scw`], config.cache.SCW_LOCK_TTL);
        if (!redisLock) {
          log.error(`'Redlock not initialized'`);
          throw new Error('Redlock not initialized');
        }
        log.info(`Lock acquired for chainId ${chainId} and masterFundingAccount ${mfaPublicKey}`);

        try {

          let accumulateFeeObj;
          let accumulateFeeObjfromCache = await this.cacheService.get(getAccumulatedFeeObjKey(chainId));
          if (accumulateFeeObjfromCache) {
            accumulateFeeObj = JSON.parse(accumulateFeeObjfromCache);
          } else {
            let totalFeePaidFromDb = await this.accumulatedFeeDao.getOne({ chainId, transactionType: Mode.SINGLE_CHAIN, status: config.FEE_CONVERSION_DB_STATUSES.PENDING });
            log.info(`totalFeePaidFromDb: ${stringify(totalFeePaidFromDb)}`);

            accumulateFeeObj = totalFeePaidFromDb;
          }

          if (accumulateFeeObj && accumulateFeeObj.accumulatedFeeData) {

            let nativeFeeToBeUpdatedInDB = transactionFee.add(
              accumulateFeeObj.accumulatedFeeData.feeAccumulatedInNative.toString()
            );
            log.info(`nativeFeeToBeUpdatedInDB: ${nativeFeeToBeUpdatedInDB}`);
            let feeInUsdToBeUpdatedInDB: number = transactionFeePaidInUsd + accumulateFeeObj.accumulatedFeeData.feeAccumulatedInUSD;
            log.info(`feeInUsdToBeUpdatedInDB: ${feeInUsdToBeUpdatedInDB}`);

            if (feeInUsdToBeUpdatedInDB > this.appConfig.feeSpendThreshold[chainId]) {
              let swapResponse = await this.swapManager.initiateSwap(chainId);
              log.info(`swapResponse: ${stringify(swapResponse)}`);

              await this.accumulatedFeeDao.update(
                {
                  feeAccumulatedInNative: nativeFeeToBeUpdatedInDB,
                  feeAccumulatedInUSD: feeInUsdToBeUpdatedInDB,
                  updatedOn: getTimeInMilliseconds(),
                  status: config.FEE_CONVERSION_DB_STATUSES.COMPLETE,
                },
                accumulateFeeObj.accumulatedFeeData._id
              );
              log.info(`update AccumulatedFee in DB successfully`);

              await this.cacheService.delete(getAccumulatedFeeObjKey(chainId));
              log.info(`Cache entry deleted`);
            } else {
              // TODO: Sachin: Do not await db updating call, instead put this .update call in try catch block and in case of error send notification
              await this.accumulatedFeeDao.update(
                {
                  feeAccumulatedInNative: nativeFeeToBeUpdatedInDB,
                  feeAccumulatedInUSD: feeInUsdToBeUpdatedInDB,
                  updatedOn: getTimeInMilliseconds(),
                },
                accumulateFeeObj.accumulatedFeeData._id
              );
              log.info(`updateAccumulatedFee in DB successfully`);

              await this.cacheService.set(getAccumulatedFeeObjKey(chainId), JSON.stringify({
                _id: accumulateFeeObj.accumulatedFeeData._id,
                feeAccumulatedInNative: nativeFeeToBeUpdatedInDB,
                feeAccumulatedInUSD: feeInUsdToBeUpdatedInDB,
                updatedOn: getTimeInMilliseconds(),
              }));
              await this.cacheService.expire(getAccumulatedFeeObjKey(chainId), config.accumulatedFeeObjKeyExpiry);

              log.info(`Accumulated feeInUsd updated in cache`);
              log.info('feeInUsdToBeUpdatedInDB < this.appConfig.feeSpendThreshold[chainId], no conversion initiated');
            }
          } else {
            // for a new entry, remove the old entry from cache
            await this.cacheService.delete(getAccumulatedFeeObjKey(chainId));
            log.info(`Cache entry deleted`);

            let addAccumulatedFeeToDBRequest = await this.accumulatedFeeDao.add({
              startTime: getTimeInMilliseconds(),
              feeAccumulatedInNative: transactionFee,
              feeAccumulatedInUSD: transactionFeePaidInUsd,
              tokenSymbol: nativeTokenInfo.symbol,
              chainId,
              status: config.FEE_CONVERSION_DB_STATUSES.PENDING,
              createdOn: getTimeInMilliseconds(),
              transactionType: Mode.SINGLE_CHAIN
            });

            if (addAccumulatedFeeToDBRequest.code !== config.RESPONSE_CODES.SUCCESS) {
              log.error(`Error While adding AccumulatedFee in DB`);
              throw new Error(`Error while adding to AccumulatedFee`);
            }
          }
        } catch (error: any) {
          log.error(error);
          throw error;
        }
        finally {
          // Release the lock.
          await redisLock.release();
          log.info(`Lock released for chainId ${chainId} and masterFundingAccount ${mfaPublicKey}`);
        }
      } else {
        log.error(`gasUsed property not found in transaction receipt for chainId ${chainId}`);
        throw new Error(`gasUsed property not found in transaction receipt for chainId ${chainId}`);
      }
    } catch (error: any) {
      log.error(error);
      throw error;
    }
  }

  /** Get the transaction GasPrice
   * check in DB if already an entry, if yes, update currentValueFromDB + incomingGasFee, in DB
   * Check key in cache, if available, update cacheValue + incomingGasFee, in cache
   * if not, create a new entry with PENDING status with incomingGasFee
   * set value in cache with incomingGasFee as value
   */
  async onTransactionCCMP(transactionReceipt: ethers.providers.TransactionReceipt, chainId: number) {
    // TODO: Sachin: Check for undefined value of transactionReceipt - done
    if (!transactionReceipt) {
      throw new Error(`Transaction Receipt is undefined`);
    }
    let redisLock: Lock | undefined;
    let mfaPublicKey: string = this.masterFundingAccount.getPublicKey();
    try {
      if (transactionReceipt.gasUsed) {
        // TODO: Sachin: Rename the method to getNativeTokenInfo - done
        // TODO: Sachin: Rename variable to nativeTokenInfo - done
        let nativeTokenInfo = tokenUtils.getNativeTokenInfo(chainId, this.appConfig.tokenList);
        if (!nativeTokenInfo) {
          log.error(`native Token Info not Available`);
          throw new Error(`Native Token Info not Available for chain id ${chainId}`);
        }
        let networkGasPrice = await this.transactionServiceMap[chainId].networkService.getGasPrice();
        log.info(`networkGasPrice: ${networkGasPrice}`);

        let transactionFee = transactionReceipt.gasUsed.mul(networkGasPrice.gasPrice);
        log.info(`transactionFee: ${transactionFee}`);

        let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(nativeTokenInfo.symbol);
        log.info(`tokenUsdPrice: ${tokenUsdPrice}`);

        let transactionFeePaidInUsd = parseFloat((transactionFee.mul(tokenUsdPrice)).toString()) / Math.pow(10, nativeTokenInfo.decimal);
        log.info(`transactionFeePaidInUsd: ${transactionFeePaidInUsd}`);

        // TODO: Sachin: Take the redis db lock here before quering the DB - done
        log.info(`trying to acquire lock for chainId ${chainId} and masterFundingAccount ${mfaPublicKey}`);
        if (!this.cacheService || !this.cacheService.getRedLock()) {
          throw new Error("Error while getting Redlock instance");
        }
        redisLock = await this.cacheService.getRedLock()?.acquire([`locks:${chainId}_${mfaPublicKey}_ccmp`], config.cache.SCW_LOCK_TTL);
        if (!redisLock) {
          log.error(`'Redlock not initialized'`);
          throw new Error('Redlock not initialized');
        }
        log.info(`Lock acquired for chainId ${chainId} and masterFundingAccount ${mfaPublicKey}`);

        // TODO: Sachin: From the dao, get this info from cache and if not found get from db.
        try {
          let totalFeePaidFromDb = await this.accumulatedFeeDao.getOne({ chainId, transactionType: Mode.CROSS_CHAIN, status: 'PENDING' });
          log.info(`totalFeePaidFromDb: ${totalFeePaidFromDb}`);

          if (totalFeePaidFromDb && totalFeePaidFromDb.accumulatedFeeData) {
            let nativeFeeToBeUpdatedInDB = transactionFee.add(
              totalFeePaidFromDb.accumulatedFeeData.feeAccumulatedInNative
            );
            log.info(`nativeFeeToBeUpdatedInDB: ${nativeFeeToBeUpdatedInDB}`);
            let feeInUsdToBeUpdatedInDB: number = transactionFeePaidInUsd + totalFeePaidFromDb.accumulatedFeeData.feeAccumulatedInUSD;
            log.info(`feeInUsdToBeUpdatedInDB: ${feeInUsdToBeUpdatedInDB}`);

            // TODO: Sachin: Do not await db updating call, instead put this .update call in try catch block and in case of error send notification
            let updateAccumulatedFeeRequest = await this.accumulatedFeeDao.update(
              {
                feeAccumulatedInNative: nativeFeeToBeUpdatedInDB,
                feeAccumulatedInUSD: feeInUsdToBeUpdatedInDB,
                updatedOn: getTimeInMilliseconds(),
              },
              totalFeePaidFromDb.accumulatedFeeData._id
            );
            log.info(`updateAccumulatedFee in DB successfully`);

            await this.cacheService.set(getGasFeePaidKey(chainId), feeInUsdToBeUpdatedInDB.toString());
            log.info(`Accumulated feeInUsd updated in cache`);

            if (feeInUsdToBeUpdatedInDB > this.appConfig.feeSpendThreshold[chainId]) {
              let mfaUSDBalanceMap = await this.balanceManager.calculateMFABalanceInUSD();
              log.info(`mfaUSDBalanceMap: ${stringify(mfaUSDBalanceMap)}`);

              let deltaMap = await this.deltaManager.calculateDelta(mfaUSDBalanceMap, chainId);
              log.info(`deltaMap: ${stringify(deltaMap)}`);

              let routes: Array<RouteParams> = await this.pathManager.findAllRoutes(deltaMap, chainId);
              log.info(`Sorted Routes: ${stringify(routes)}`);

              let rebalanceMFA = await this.pathManager.rebalanceMFA(routes, deltaMap.positiveDeltaMap);
            }
          } else {
            let addAccumulatedFeeToDBRequest = await this.accumulatedFeeDao.add({
              startTime: getTimeInMilliseconds(),
              feeAccumulatedInNative: transactionFee,
              feeAccumulatedInUSD: transactionFeePaidInUsd,
              tokenSymbol: nativeTokenInfo.symbol,
              chainId,
              status: config.FEE_CONVERSION_DB_STATUSES.PENDING,
              createdOn: getTimeInMilliseconds(),
              transactionType: Mode.CROSS_CHAIN
            });

            if (addAccumulatedFeeToDBRequest.code !== config.RESPONSE_CODES.SUCCESS) {
              log.error(`Error While adding AccumulatedFee in DB`);
              throw new Error(`Error while adding to AccumulatedFee`);
            }
            await this.cacheService.set(getGasFeePaidKey(chainId), transactionFeePaidInUsd.toString());
          }
        } catch (err: any) {
          log.info(err);
        } finally {
          // Release the lock.
          await redisLock.release();
          log.info(`Lock released for chainId ${chainId} and masterFundingAccount ${mfaPublicKey}`);
        }
      } else {
        log.error(`gasUsed property not found in transaction receipt for chainId ${chainId}`);
        throw new Error(`gasUsed property not found in transaction receipt for chainId ${chainId}`);
      }
    } catch (error: any) {
      log.error(error);
      throw error;
    }
  }
}

export { FeeManager };