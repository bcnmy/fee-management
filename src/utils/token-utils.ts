import { BigNumber, ethers } from 'ethers';
import { config } from '../config';
import { TokenData } from '../types';
import { log } from '../logs';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { stringify } from './common-utils';

export function getNativeTokenInfo(chainId: number, tokenList: Record<number, TokenData[]>): TokenData | undefined {
  let token: TokenData | undefined;

  try {
    for (let index = 0; index < tokenList[chainId].length; index++) {
      let tokenData = tokenList[chainId][index];
      if (tokenData.address === config.NATIVE_ADDRESS_RELAYER || tokenData.address === config.NATIVE_ADDRESS_ROUTER) {
        token = {
          address: tokenData.address,
          symbol: tokenData.symbol,
          decimal: tokenData.decimal,
        };
      }
    }

    log.info(`token: ${stringify(token)}`);
    return token;
  } catch (error: any) {
    log.error(`Error while getNativeTokenInfo ${stringify(error)}`);
    throw new Error(`Error while getNativeTokenInfo ${stringify(error)}`);
  }
}

// TODO: Sachin: Remove these method. These are not utility methods
export async function getErc20TokenBalance(
  chainId: number,
  provider: ethers.providers.JsonRpcProvider,
  tokenAddress: string,
  masterFundingAccount: IEVMAccount
): Promise<BigNumber> {
  try {
    let erc20Contract = new ethers.Contract(tokenAddress, config.erc20Abi, provider);

    let balance = await erc20Contract['balanceOf'].apply(null, masterFundingAccount.getPublicKey());

    log.info(`Erc20 Funds balance in ${masterFundingAccount.getPublicKey()} on chainId ${chainId} is ${balance}`);

    return balance;
  } catch (error: any) {
    log.error(`Error while calculating BalanceOf ${tokenAddress} in ${masterFundingAccount.getPublicKey()} account`);
    throw new Error(
      `Error while calculating BalanceOf ${tokenAddress} in ${masterFundingAccount.getPublicKey()} account`
    );
  }
}

export async function getNativeTokenBalance(
  chainId: number,
  provider: ethers.providers.JsonRpcProvider,
  tokenAddress: string,
  masterFundingAccount: IEVMAccount
): Promise<BigNumber> {
  try {
    let balance = await provider.getBalance(masterFundingAccount.getPublicKey());

    log.info(`Native Funds balance in ${masterFundingAccount.getPublicKey()} on chainId ${chainId} is ${balance}`);

    return balance;
  } catch (error: any) {
    log.error(`Error while calculating BalanceOf ${tokenAddress} in ${masterFundingAccount.getPublicKey()} account`);
    throw new Error(
      `Error while calculating BalanceOf ${tokenAddress} in ${masterFundingAccount.getPublicKey()} account`
    );
  }
}
