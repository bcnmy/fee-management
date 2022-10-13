import { MasterFundingAccount, TokenList , rpcUrlMap} from "./types";
import { SIGNATURE_TYPES, RESPONSE_CODES, EXIT_STATUS } from "./config";

class FeeManagement {
    constructor( 
        rpcUrlMap: rpcUrlMap,
        masterFundingAmount: MasterFundingAccount, 
        relayerAddresses: String[], 
        tokenList: TokenList[], 
        config: any,
        IDBService: any,
        ITokenService: any,
        ICacheService: any
    ){

    }
}

export { FeeManagement, RESPONSE_CODES, SIGNATURE_TYPES, EXIT_STATUS }