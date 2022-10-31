// import "{ } from "./types";
import { IBridgeService } from "../bridge/interfaces/IBridgeService";
import { ISwapManager } from "../swap/interfaces/ISwapManager";
import { IPathManager } from "./interfaces/IPathManager";
import { ICacheService } from "../relayer-node-interfaces/ICacheService";
import { ITokenPrice } from "../relayer-node-interfaces/ITokenPrice";
import { AppConfig, PathParams, EVMRawTransactionType, MasterFundingAccount, TokenData, DeltaMap } from "../types";
import { ethers } from "ethers";
import { ITransactionService } from "../relayer-node-interfaces/ITransactionService";
import { IEVMAccount } from "../relayer-node-interfaces/IEVMAccount";
import { config, NATIVE_ADDRESS } from "../config";
import { IBalanceManager } from "./interfaces/IBalanceManager";
class PathManager implements IPathManager {
    swapManager: ISwapManager;
    bridgeService: IBridgeService;
    cacheService: ICacheService;
    masterFundingAccount: MasterFundingAccount;
    tokenList: Record<number, TokenData[]>;
    appConfig: AppConfig;
    tokenPriceService: ITokenPrice;
    transactionServiceMap: Record<number, ITransactionService<IEVMAccount, EVMRawTransactionType>>;
    balanceManager: IBalanceManager;
    hyphenSupportedTokenMap: Record<number, TokenData>
    oneIncheTokenMap:  Record<number, Record<string, string>> 

    constructor( pathParams: PathParams ){
        this.swapManager = pathParams.swapManager;
        this.bridgeService = pathParams.bridgeService;
        this.masterFundingAccount = pathParams.masterFundingAccount;
        this.tokenList = pathParams.tokenList;
        this.appConfig = pathParams.appConfig;
        this.tokenPriceService = pathParams.tokenPriceService;
        this.transactionServiceMap = pathParams.transactionServiceMap;
        this.balanceManager = pathParams.balanceManager;
    }
    setOneInchSupportedTokenMap(oneIncheTokenMap:  Record<number, Record<string, string>> ) {
        this.oneIncheTokenMap = oneIncheTokenMap;
    }

    setHyphenSupportedTokenMap(hyphenSupportedTokenMap: Record<number, TokenData>){
        this.hyphenSupportedTokenMap = hyphenSupportedTokenMap;
    }

    async findAllRoutes( deltaMap:  DeltaMap, toChainId: number ){
        try {
            for (let fromChainId in deltaMap.negativeDeltaMap) {
                for (let tokenRecordIndex = 0; tokenRecordIndex < this.tokenList[fromChainId].length; tokenRecordIndex++) {
                    let swapNBridgeCostInUsd = await this.getSwapNBridgeCost(Number(fromChainId), toChainId, this.tokenList[fromChainId][tokenRecordIndex].address);
                    let bridgeNSwapCostInUsd = await this.getBridgeNSwapCost(Number(fromChainId), toChainId, this.tokenList[fromChainId][tokenRecordIndex].address);
                }
            }
        } catch (error){

        }
    }
    getBridgeNSwapCost(fromChainId: number, toChainId: number, fromTokenAddress: string): Promise<ethers.BigNumber> {
        throw new Error("Method not implemented.");
    }

    // TODO: Logs & Error handling
    async getSwapNBridgeCost(fromChainId: number, toChainId: number, fromTokenAddress: string): Promise<ethers.BigNumber> {
        
        let fromTokenBalance = await this.balanceManager.getBalance(Number(fromChainId), fromTokenAddress);
        let swapTokenAddress = this.oneIncheTokenMap[fromChainId][config.NATIVE_TOKEN_SYMBOL[toChainId]]; 

        // estimate swap cost
        let quoteForSwap = await this.swapManager.getQuote(
            fromChainId, 
            fromTokenAddress, 
            swapTokenAddress,
            fromTokenBalance
        );    

        let toTokenBalance = quoteForSwap.toTokenAmount;

        let networkGasPrice = await this.transactionServiceMap[fromChainId].networkService.getGasPrice();
        let swapCostInNativeCurrency = (quoteForSwap.estimatedGas).mul(networkGasPrice.gasPrice);

        let tokenPriceInUsd = await this.tokenPriceService.getTokenPrice(config.NATIVE_TOKEN_SYMBOL[fromChainId]);
        let swapCostInUsd = swapCostInNativeCurrency.mul(tokenPriceInUsd);

        // TODO check if exit is allowed for swappedtokenAddress

        // estimate bridge cost
        let depositCostInUsd =  await this.bridgeService.getDepositCost({
            fromChainId: Number(fromChainId),
            toChainId: toChainId,
            tokenAddress: swapTokenAddress,
            receiver: this.masterFundingAccount.publicAddress,
            amount: Number(toTokenBalance),
            tag: "FEE_MANAGEMENT_SERVICE"
        })

        let exitCostInTransferredToken =  await this.bridgeService.getExitCost({
            fromChainId: Number(fromChainId),
            toChainId: toChainId,
            tokenAddress: swapTokenAddress,
            transferAmount: toTokenBalance
        })

        let exitTokenUsdPrice = await this.tokenPriceService.getTokenPrice(config.NATIVE_TOKEN_SYMBOL[toChainId]);
        let exitCostInUsd = ethers.BigNumber.from(exitCostInTransferredToken).mul(exitTokenUsdPrice);

        let swapNBridgeCostInUsd = swapCostInUsd.add(depositCostInUsd).add(exitCostInUsd);
        return swapNBridgeCostInUsd;
    }
}
    

export { PathManager }