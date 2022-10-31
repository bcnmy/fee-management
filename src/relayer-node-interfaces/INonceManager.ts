import { ICacheService } from './ICacheService';
import { INetworkService } from './INetworkService';

export interface INonceManager<AccountType, RawTransactionType> {
  chainId: number;
  networkService: INetworkService<AccountType, RawTransactionType>;
  cacheService: ICacheService;

  getNonce(address: string, pendingCount?: boolean): Promise<number>;
  markUsed(address: string, nonce: number): Promise<void>;
  incrementNonce(address: string): Promise<boolean>;
}
