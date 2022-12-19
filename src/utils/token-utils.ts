import { BigNumber, ethers } from 'ethers';
import { config } from '../config';
import { TokenData } from '../types';
import { log } from '../logs';
import { IEVMAccount } from '../relayer-node-interfaces/IEVMAccount';
import { stringify } from './common-utils';

function getNativeTokenInfo(chainId: number, tokenList: Record<number, TokenData[]>): TokenData | undefined {
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

export { getNativeTokenInfo }
