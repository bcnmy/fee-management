import { BigNumber } from "ethers";
import { SingleChainBalanceManager } from "../gas-management/SingleChainBalanceManager";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { ITokenPrice } from "../relayer-node-interfaces/ITokenPrice";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { EVMRawTransactionType } from "../types";
import { MockMFA } from "./mocks/mockMFA";
import { MockTokenService } from "./mocks/mockTokenService";
import { MockTransactionService } from "./mocks/mockTransactionService";
import { MockTransactionServiceFail } from "./mocks/mockTransactionServiceFail";


describe('Transaction Service: Sending Transaction on chainId: 5', () => {

    let singleChainBalanceManager: SingleChainBalanceManager;
    let singleChainBalanceManagerFail: SingleChainBalanceManager;
    let transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>> = {};
    let transactionServiceFailMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>> = {};
    let tokenPriceService;
    let tokenList = {}
    let masterFundingAccount;
    let chainId = 5;
    let nativeToken = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    let tokenAddress = "0x64ef393b6846114bad71e2cb2ccc3e10736b5716";

    beforeAll(async () => {
        let transactionService = new MockTransactionService();
        transactionServiceMap[chainId] = transactionService;

        let transactionServiceFail = new MockTransactionServiceFail();
        transactionServiceFailMap[chainId] = transactionServiceFail;

        tokenPriceService = new MockTokenService();
        masterFundingAccount = new MockMFA();

        singleChainBalanceManager = new SingleChainBalanceManager({
            masterFundingAccount,
            transactionServiceMap,
            tokenList,
            tokenPriceService
        });

        singleChainBalanceManagerFail = new SingleChainBalanceManager({
            masterFundingAccount,
            transactionServiceMap: transactionServiceFailMap,
            tokenList,
            tokenPriceService
        });
    })

    it('getBalance(): Get Balance for NATIVE_TOKEN', async () => {

        expect(await singleChainBalanceManager.getBalance(chainId, nativeToken
        )).toEqual(BigNumber.from(1));
    });

    it('getBalance(): Get Balance for ERC20Token', async () => {

        expect(await singleChainBalanceManager.getBalance(chainId, tokenAddress)).toEqual(BigNumber.from(1));
    });

    it('getBalance(): Throw error while getting Balance for NATIVE_TOKEN', async () => {
        await expect(singleChainBalanceManagerFail.getBalance(chainId, nativeToken)).rejects.toThrow();
    });

    it('getBalance(): Throw error while getting Balance for ERC20Token', async () => {
        await expect(singleChainBalanceManagerFail.getBalance(chainId, tokenAddress)).rejects.toThrow();
    });
});