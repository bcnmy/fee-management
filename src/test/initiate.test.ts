jest.mock('node-fetch');

import { ethers } from 'ethers';
import { FeeManager } from '..';
import { ICacheService } from '../relayer-node-interfaces/ICacheService';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { ITokenPrice } from '../relayer-node-interfaces/ITokenPrice';
import { ITransactionService } from '../relayer-node-interfaces/ITransactionService';
import { AppConfig, EVMRawTransactionType, Mode } from '../types';
import { MockCache } from './mocks/mockCache';
import { MockMFA } from './mocks/mockMFA';
const { MongoClient } = require('mongodb');
import * as tokenUtils from '../utils/token-utils';
import { MockTokenService } from './mocks/mockTokenService';
import { MockTransactionService } from './mocks/mockTransactionService';
import { AccumulatedFeeDAO } from '../mongo/dao/AccumulatedFeeDAO';

const fetch = require('node-fetch');

describe('Transaction Service: Sending Transaction on chainId: 5', () => {
  let feeManager: FeeManager;
  let transactionReceipt = {
    "transactionHash": "0x5a96936256f745d4ef81ca21540f2e5caa46164cb7bdb907e7e0a0695472afef",
    "blockHash": "0x1c5cfaff1358dae3def9d4e0b54c6930ccd80138083de8141aeeb6482a652bec",
    "blockNumber": 35432700,
    "logs": [
      {
        "transactionHash": "0x5a96936256f745d4ef81ca21540f2e5caa46164cb7bdb907e7e0a0695472afef",
        "address": "0x622d8fea4603ba9edaf1084b407052d8b0a9bed7",
        "blockHash": "0x1c5cfaff1358dae3def9d4e0b54c6930ccd80138083de8141aeeb6482a652bec",
        "blockNumber": 35432700,
        "data": "0x00000000000000000000000000000000000000000000000000000000000010fe0000000000000000000000000000000000000000000000000000000000000001",
        "logIndex": 346,
        "removed": false,
        "topics": [
          "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62",
          "0x0000000000000000000000009c9644fcdbc4e271d8165257e10eeb4e8f607fe9",
          "0x0000000000000000000000009c9644fcdbc4e271d8165257e10eeb4e8f607fe9",
          "0x000000000000000000000000bc07dd023703272d2d6f923ef17f2581506cac46"
        ],
        "transactionIndex": 60
      },
      {
        "transactionHash": "0x5a96936256f745d4ef81ca21540f2e5caa46164cb7bdb907e7e0a0695472afef",
        "address": "0x0000000000000000000000000000000000001010",
        "blockHash": "0x1c5cfaff1358dae3def9d4e0b54c6930ccd80138083de8141aeeb6482a652bec",
        "blockNumber": 35432700,
        "data": "0x000000000000000000000000000000000000000000000000000aeb69f0229c00000000000000000000000000000000000000000000000003d318a942997773df00000000000000000000000000000000000000000000022ccb608693f8c97948000000000000000000000000000000000000000000000003d30dbdd8a954d7df00000000000000000000000000000000000000000000022ccb6b71fde8ec1548",
        "logIndex": 347,
        "removed": false,
        "topics": [
          "0x4dfe1bbbcf077ddc3e01291eea2d5c70c2b422b415d95645b9adcfd678cb1d63",
          "0x0000000000000000000000000000000000000000000000000000000000001010",
          "0x0000000000000000000000000b1c8f78f0d8ce21e284b5acd521f8d13dc0ac94",
          "0x00000000000000000000000000b69ba135b496b7f17fdfcd50d48b86bb397be6"
        ],
        "transactionIndex": 60
      }
    ],
    "contractAddress": "",
    "effectiveGasPrice": ethers.BigNumber.from("0x1154f85065"),
    "cumulativeGasUsed": ethers.BigNumber.from("0x1b93c71"),
    "from": "0x0b1c8f78f0d8ce21e284b5acd521f8d13dc0ac94",
    "gasUsed": ethers.BigNumber.from("0x19035"),
    "logsBloom": "0x00000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000008000000000000000000000002000000000000000000000000000000000800000000000040000000100000000080000000000000000000200000000000000000000000000000080000000000000000000000000000000000000000000000000000000000001000000100000000000200020020000000000000000000000000000000000000000000000000000004000000100080000000001000000000000000000080008000400100000000000000000000400000000000000000000000000000000000000040000080000100008",
    "status": 1,
    "to": "0x659a1f925b0d714f0818899574f7e79901ca460c",
    "transactionIndex": 60,
    "type": 2,
    "confirmations": 0,
    "byzantium": false
  };
  let chainId = 5;
  let dbUrl: string = "mongodb://localhost:27017/instaExit";
  let connection: any;
  let db;
  let transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>> = {};
  let accumulatedFee: AccumulatedFeeDAO;
  let cacheService: ICacheService;

  beforeAll(async () => {
    accumulatedFee = new AccumulatedFeeDAO();
    let masterFundingAccount: IEVMAccount = new MockMFA();
    let relayerAddresses: String[] = [];
    let appConfig: AppConfig = {
      tokenList: {},
      nativeTokenSymbol: {},
      noOfDepositConfirmation: {},
      hyphenLiquidityPoolAddress: {},
      balanceThreshold: {},
      feeSpendThreshold: {},
      initialFundingAmountInUsd: {}
    };
    let tokenPriceService: ITokenPrice = new MockTokenService();
    cacheService = new MockCache();
    let transactionService = new MockTransactionService();
    transactionServiceMap[chainId] = transactionService;
    let mode: Mode = Mode.SINGLE_CHAIN;
    let label: string = "SCW";
    feeManager = new FeeManager({
      masterFundingAccount,
      relayerAddresses,
      appConfig,
      dbUrl,
      tokenPriceService,
      cacheService,
      transactionServiceMap,
      mode,
      label
    });

    connection = await MongoClient.connect(dbUrl, {
      useNewUrlParser: true,
    });
  });

  afterAll(async () => {
    await connection.close();
  });

  it('Call onTransactionSCW() successfully if DB entry is already there', async () => {

    jest.spyOn(tokenUtils, "getNativeTokenInfo").mockReturnValue({
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: "ETH",
      decimal: 18
    });

    fetch.mockResolvedValueOnce(Promise.resolve({
      json: () =>
        Promise.resolve({
          "code": 200,
          "message": "SupportedPair data fetched successfully",
          "supportedPairList": [
            {
              "tokenSymbol": "USDT",
              "decimal": 18,
              "address": "0x64ef393b6846114bad71e2cb2ccc3e10736b5716",
              "chainId": 5,
              "toChainId": 80001,
              "toChainToken": "0xeabc4b91d9375796aa4f69cc764a4ab509080a58"
            },
            {
              "tokenSymbol": "USDC",
              "decimal": 6,
              "address": "0xb5b640e6414b6def4fc9b3c1eef373925effeccf",
              "chainId": 5,
              "toChainId": 80001,
              "toChainToken": "0xda5289fcaaf71d52a80a254da614a192b693e977"
            },
            {
              "tokenSymbol": "ETH",
              "decimal": 18,
              "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
              "chainId": 5,
              "toChainId": 80001,
              "toChainToken": "0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa"
            }
          ]
        }),
    })).mockResolvedValueOnce(Promise.resolve({
      json: () =>
        Promise.resolve({
          "tokens": {
            "0x64ef393b6846114bad71e2cb2ccc3e10736b5716": {
              "symbol": "USDT",
              "name": "USDT",
              "decimals": 18,
              "address": "0x64ef393b6846114bad71e2cb2ccc3e10736b5716",
              "logoURI": "",
              "tags": [
                "tokens",
                "USDT"
              ]
            }
          },
          "0xbf22b04e250a5921ab4dc0d4ced6e391459e92d4": {
            "symbol": "USDT",
            "name": "USDT",
            "decimals": 18,
            "address": "0xbf22b04e250a5921ab4dc0d4ced6e391459e92d4",
            "logoURI": "",
            "tags": [
              "tokens",
              "USDT"
            ]
          }
        }),
    }))

    jest.spyOn(AccumulatedFeeDAO.prototype, 'getOne').mockImplementation(() => Promise.resolve(
      {
        accumulatedFeeData: {
          feeAccumulatedInNative: 5,
          feeAccumulatedInUSD: 1000
        }
      }
    ));

    jest.spyOn(AccumulatedFeeDAO.prototype, 'update').mockImplementation(() => Promise.resolve(
      { code: 200, message: "Success" }
    ));

    jest.spyOn(MockCache.prototype, 'set').mockImplementation(() => Promise.resolve(true));

    expect(await feeManager.init()).resolves;
    expect(await feeManager.onTransactionSCW(transactionReceipt, chainId)).not.toThrowError;
  });


  it('Call onTransactionSCW() successfully if no DB entry is there', async () => {

    jest.spyOn(tokenUtils, "getNativeTokenInfo").mockReturnValue({
      address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      symbol: "ETH",
      decimal: 18
    });

    fetch.mockResolvedValueOnce(Promise.resolve({
      json: () =>
        Promise.resolve({
          "code": 200,
          "message": "SupportedPair data fetched successfully",
          "supportedPairList": [
            {
              "tokenSymbol": "USDT",
              "decimal": 18,
              "address": "0x64ef393b6846114bad71e2cb2ccc3e10736b5716",
              "chainId": 5,
              "toChainId": 80001,
              "toChainToken": "0xeabc4b91d9375796aa4f69cc764a4ab509080a58"
            },
            {
              "tokenSymbol": "USDC",
              "decimal": 6,
              "address": "0xb5b640e6414b6def4fc9b3c1eef373925effeccf",
              "chainId": 5,
              "toChainId": 80001,
              "toChainToken": "0xda5289fcaaf71d52a80a254da614a192b693e977"
            },
            {
              "tokenSymbol": "ETH",
              "decimal": 18,
              "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
              "chainId": 5,
              "toChainId": 80001,
              "toChainToken": "0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa"
            }
          ]
        }),
    })).mockResolvedValueOnce(Promise.resolve({
      json: () =>
        Promise.resolve({
          "tokens": {
            "0x64ef393b6846114bad71e2cb2ccc3e10736b5716": {
              "symbol": "USDT",
              "name": "USDT",
              "decimals": 18,
              "address": "0x64ef393b6846114bad71e2cb2ccc3e10736b5716",
              "logoURI": "",
              "tags": [
                "tokens",
                "USDT"
              ]
            }
          },
          "0xbf22b04e250a5921ab4dc0d4ced6e391459e92d4": {
            "symbol": "USDT",
            "name": "USDT",
            "decimals": 18,
            "address": "0xbf22b04e250a5921ab4dc0d4ced6e391459e92d4",
            "logoURI": "",
            "tags": [
              "tokens",
              "USDT"
            ]
          }
        }),
    }))

    jest.spyOn(AccumulatedFeeDAO.prototype, 'getOne').mockImplementation(() => Promise.resolve(
      {
        code: 404,
        message: "Not Found"
      }
    ));

    jest.spyOn(AccumulatedFeeDAO.prototype, 'add').mockImplementation(() => Promise.resolve(
      { code: 200, message: "Success" }
    ));

    jest.spyOn(MockCache.prototype, 'set').mockImplementation(() => Promise.resolve(true));

    expect(await feeManager.init()).resolves;
    expect(await feeManager.onTransactionSCW(transactionReceipt, chainId)).not.toThrowError;
  });

});