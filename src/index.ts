import {
  AppConfig,
  FeeManagerParams,
  EVMRawTransactionType,
  RouteParams,
} from './types';
import { config, SIGNATURE_TYPES, RESPONSE_CODES, EXIT_STATUS, FEE_CONVERSION_DB_STATUSES } from './config';
import { ICacheService } from './relayer-node-interfaces/ICacheService';
import { ITokenPrice } from './relayer-node-interfaces/ITokenPrice';
import { log } from './logs';
import { getGasFeePaidKey } from './utils/cache-utils';
import { getTimeInMilliseconds, stringify } from './utils/common-utils';
import { getNativeTokenInfo } from './utils/token-utils';
import { ethers } from 'ethers';
import { AccumulatedFeeDAO } from './mongo/dao';
import { DeltaManager } from './gas-management/delta-manager';
import { IDeltaManager } from './gas-management/interfaces/IDeltaManager';
import { ITransactionService } from './relayer-node-interfaces/ITransactionService';
import { IEVMAccount } from './relayer-node-interfaces/IEVMAccount';
import { IPathManager } from './gas-management/interfaces/IPathManager';
import { PathManager } from './gas-management/path-manager';
import { ISwapManager } from './swap/interfaces/ISwapManager';
import { IBridgeService } from './bridge/interfaces/IBridgeService';
import { OneInchManager } from './swap/1inch/1Inch-manager';
import { HyphenBridge } from './bridge/hyphen-bridge';
import { IBalanceManager } from './gas-management/interfaces/IBalanceManager';
import { BalanceManager } from './gas-management/balance-manager';
import { INetwork } from './blockchain/interface/INetwork';
import { Network } from './blockchain/network';
import { ITransactionDAO } from './relayer-node-interfaces/ITransactionDAO';
import type { Lock } from "redlock";

class FeeManager {
  masterFundingAccount: IEVMAccount;
  relayerAddresses: String[];
  appConfig: AppConfig;
  dbService: ITransactionDAO;
  tokenPriceService: ITokenPrice;
  cacheService: ICacheService;
  accumulatedFeeDao: AccumulatedFeeDAO;
  deltaManager: IDeltaManager;
  pathManager: IPathManager;
  swapManager: ISwapManager;
  bridgeService: IBridgeService;
  balanceManager: IBalanceManager;
  networkMap: Record<number, INetwork> = {};
  transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
  oneIncheTokenMap: Record<number, Record<string, string>> = {};
  hyphenSupportedTokenMap: Record<number, Record<string, Record<number, string>>> = {};

  constructor(feeManagerParams: FeeManagerParams) {
    this.transactionServiceMap = feeManagerParams.transactionServiceMap;
    log.info(`transactionServiceMap Initiated successfully`);

    for (let chainId in this.transactionServiceMap) {
      let network = new Network({
        provider: this.transactionServiceMap[chainId].networkService.ethersProvider,
        liquidityPoolAddress: config.hyphenLiquidityPoolAddress[chainId],
      });
      this.networkMap[chainId] = network;
    }

    log.info(`networkMap Initiated successfully`);

    this.swapManager = new OneInchManager();
    log.info(`swapManager Initiated successfully`);

    this.masterFundingAccount = feeManagerParams.masterFundingAccount;
    log.info(`masterFundingAccount Initiated successfully`);

    this.relayerAddresses = feeManagerParams.relayerAddresses;
    log.info(`relayerAddresses Initiated successfully`);

    this.appConfig = feeManagerParams.appConfig;
    log.info(`appConfig Initiated successfully`);

    this.dbService = feeManagerParams.dbService;
    log.info(`dbService Initiated successfully`);

    // TODO: validate feeManagerParams.tokenPriceService, if undefined throw exception. Do this for all required parameters.
    this.tokenPriceService = feeManagerParams.tokenPriceService;
    log.info(`tokenPriceService Initiated successfully`);

    this.cacheService = feeManagerParams.cacheService;
    log.info(`cacheService Initiated successfully`);

    this.accumulatedFeeDao = new AccumulatedFeeDAO();
    log.info(`accumulatedFeeDao class Initiated successfully`);

    this.balanceManager = new BalanceManager({
      transactionServiceMap: this.transactionServiceMap,
      masterFundingAccount: this.masterFundingAccount,
      tokenList: this.appConfig.tokenList,
      tokenPriceService: this.tokenPriceService,
    });
    log.info(`balanceManager Initiated successfully`);

    this.deltaManager = new DeltaManager({
      cacheService: this.cacheService,
      masterFundingAccount: this.masterFundingAccount,
      appConfig: this.appConfig,
      transactionServiceMap: this.transactionServiceMap,
      balanceManager: this.balanceManager,
    });
    log.info(`deltaManager Initiated successfully`);

    this.bridgeService = new HyphenBridge({
      transactionServiceMap: this.transactionServiceMap,
      networkMap: this.networkMap,
      tokenPriceService: this.tokenPriceService,
      masterFundingAccount: this.masterFundingAccount,
    });
    log.info(`bridgeService Initiated successfully`);

    this.pathManager = new PathManager({
      swapManager: this.swapManager,
      bridgeService: this.bridgeService,
      masterFundingAccount: this.masterFundingAccount,
      tokenList: this.appConfig.tokenList,
      appConfig: this.appConfig,
      tokenPriceService: this.tokenPriceService,
      transactionServiceMap: this.transactionServiceMap,
      balanceManager: this.balanceManager,
    });
    log.info(`pathManager Initiated successfully`);
  }

  async init() {
    for (let chainId in this.transactionServiceMap) {
      let hyphenSupportedTokens = await this.bridgeService.getHyphenSupportedToken(Number(chainId));
      this.hyphenSupportedTokenMap[chainId] = hyphenSupportedTokens;

      let oneInchSupportedTokens = await this.swapManager.getSupportedTokenList(Number(chainId));
      this.oneIncheTokenMap[chainId] = oneInchSupportedTokens;
    }

    await this.pathManager.setHyphenSupportedTokenMap(this.hyphenSupportedTokenMap);
    await this.pathManager.setOneInchSupportedTokenMap(this.oneIncheTokenMap);
  }

  /** Get the transaction GasPrice
   * check in DB if already an entry, if yes, update currentValueFromDB + incomingGasFee, in DB
   * Check key in cache, if available, update cacheValue + incomingGasFee, in cache
   * if not, create a new entry with PENDING status with incomingGasFee
   * set value in cache with incomingGasFee as value
   */
  async onTransaction(transactionReceipt: ethers.providers.TransactionReceipt, chainId: number) {
    let redisLock: Lock | undefined;
    let mfaPublicKey: string = this.masterFundingAccount.getPublicKey();
    try {
      if (transactionReceipt.gasUsed) {
        // TODO: Sachin: Rename the method to getNativeTokenInfo - done
        // TODO: Sachin: Rename variable to nativeTokenInfo - done
        let tokenInfo = getNativeTokenInfo(chainId, this.appConfig.tokenList);
        if (!tokenInfo) {
          log.error(`TokenInfo not Available`);
          throw new Error(`TokenInfo not Available`);
        }
        let networkGasPrice = await this.transactionServiceMap[chainId].networkService.getGasPrice();
        log.info(`networkGasPrice: ${networkGasPrice}`);

        let transactionFee = transactionReceipt.gasUsed.mul(networkGasPrice.gasPrice);
        log.info(`transactionFee: ${transactionFee}`);

        let tokenUsdPrice = await this.tokenPriceService.getTokenPrice(tokenInfo.symbol);
        log.info(`tokenUsdPrice: ${tokenUsdPrice}`);

        let transactionFeePaidInUsd = transactionFee.mul(tokenUsdPrice).div(tokenInfo.decimal);
        log.info(`transactionFeePaidInUsd: ${transactionFeePaidInUsd}`);

        // TODO: Sachin: Take the redis db lock here before quering the DB - done
        redisLock = await this.cacheService.getRedLock().lock(`locks:${chainId}_${mfaPublicKey}`, config.cache.LOCK_TTL);
        log.info(`Lock acquired for chainId ${chainId} and masterFundingAccount ${mfaPublicKey}`);

        let totalFeePaidFromDb = await this.accumulatedFeeDao.getOne({ chainId, status: 'PENDING' });
        log.info(`totalFeePaidFromDb: ${totalFeePaidFromDb}`);

        if (totalFeePaidFromDb && totalFeePaidFromDb.accumulatedFeeData) {
          let nativeFeeToBeUpdatedInDB = transactionFee.add(
            totalFeePaidFromDb.accumulatedFeeData.feeAccumulatedInNative
          );
          log.info(`nativeFeeToBeUpdatedInDB: ${nativeFeeToBeUpdatedInDB}`);
          let feeInUsdToBeUpdatedInDB = transactionFeePaidInUsd.add(
            totalFeePaidFromDb.accumulatedFeeData.feeAccumulatedInUSD
          );
          log.info(`feeInUsdToBeUpdatedInDB: ${feeInUsdToBeUpdatedInDB}`);

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

          if (feeInUsdToBeUpdatedInDB.gt(ethers.BigNumber.from(this.appConfig.feeSpendThreshold[chainId]))) {
            // TODO: Sachin: Move calculateMFABalanceInUSD in balance-manager.ts
            // as its related to token balances in USD and not related to calculating delta - done
            let mfaUSDBalanceMap = await this.balanceManager.calculateMFABalanceInUSD();
            log.info(`mfaUSDBalanceMap: ${stringify(mfaUSDBalanceMap)}`);

            let deltaMap = await this.deltaManager.calculateDelta(mfaUSDBalanceMap, chainId);
            log.info(`deltaMap: ${stringify(deltaMap)}`);

            let routes: Array<RouteParams> = await this.pathManager.findAllRoutes(deltaMap, chainId);
            log.info(`Sorted Routes: ${stringify(routes)}`);
          }
        } else {
          let addAccumulatedFeeToDBRequest = await this.accumulatedFeeDao.add({
            startTime: getTimeInMilliseconds(),
            feeAccumulatedInNative: transactionFee,
            feeAccumulatedInUSD: transactionFeePaidInUsd,
            tokenSymbol: tokenInfo.symbol,
            network: chainId,
            status: FEE_CONVERSION_DB_STATUSES.PEDNING,
            createdOn: getTimeInMilliseconds(),
          });

          if (addAccumulatedFeeToDBRequest.code !== RESPONSE_CODES.SUCCESS) {
            log.error(`Error While adding AccumulatedFee in DB`);
            throw new Error(`Error while adding to AccumulatedFee`);
          }
          await this.cacheService.set(getGasFeePaidKey(chainId), transactionFeePaidInUsd.toString());
        }
      } else {
        log.info('Receipt not found');
        throw new Error(`Receipt not found`);
      }
    } catch (error: any) {
      log.info(stringify(error));
      throw error;
    }
    finally {
      if (redisLock) {
        redisLock.unlock().catch((err: any) => {
          log.error(`error whle unlocking ${stringify(err)}`);
          log.info(stringify(err));
        });
      }
      log.info(`Lock released for chainId ${chainId} and masterFundingAccount ${mfaPublicKey}`);
    }
  }
}

export { FeeManager, RESPONSE_CODES, SIGNATURE_TYPES, EXIT_STATUS };
