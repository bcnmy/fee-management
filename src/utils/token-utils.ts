import { BigNumber, ethers } from "ethers";
import { NATIVE_ADDRESS, config } from "../config";
import { MasterFundingAccount, TokenData } from "../types";
import { log } from "../logs";

export function getNativeTokenInfo(chainId: number, tokenList: Record<number, TokenData[]>): TokenData | undefined {
  let token: TokenData | undefined;

  try {
    for (let index = 0; index < tokenList[chainId].length; index++) {
      let tokenData = tokenList[chainId][index];
      if ((tokenData.address = NATIVE_ADDRESS)) {
        token = {
          address: tokenData.address,
          symbol: tokenData.symbol,
          decimal: tokenData.decimal,
        };
      }
    }

    return token;
  } catch (error) {
    throw new Error("Error whole fetching the Native token Symbol");
  }
}

export async function getErc20TokenBalance(
  chainId: number,
  provider: ethers.providers.JsonRpcProvider,
  tokenAddress: string,
  masterFundingAccount: MasterFundingAccount
): Promise<BigNumber> {
  try {
    let erc20Contract = new ethers.Contract(tokenAddress, config.erc20Abi, provider);

    let balance = await erc20Contract["balanceOf"].apply(null, masterFundingAccount.publicAddress);

    log.info(`Erc20 Funds balance in ${masterFundingAccount.publicAddress} on chainId ${chainId} is ${balance}`);

    return balance;
  } catch (error) {
    log.error(`Error while calculating BalanceOf ${tokenAddress} in ${masterFundingAccount.publicAddress} account`);
    throw new Error(
      `Error while calculating BalanceOf ${tokenAddress} in ${masterFundingAccount.publicAddress} account`
    );
  }
}

export async function getNativeTokenBalance(
  chainId: number,
  provider: ethers.providers.JsonRpcProvider,
  tokenAddress: string,
  masterFundingAccount: MasterFundingAccount
): Promise<BigNumber> {
  try {
    let balance = await provider.getBalance(masterFundingAccount.publicAddress);

    log.info(`Native Funds balance in ${masterFundingAccount.publicAddress} on chainId ${chainId} is ${balance}`);

    return balance;
  } catch (error) {
    log.error(`Error while calculating BalanceOf ${tokenAddress} in ${masterFundingAccount.publicAddress} account`);
    throw new Error(
      `Error while calculating BalanceOf ${tokenAddress} in ${masterFundingAccount.publicAddress} account`
    );
  }
}
