// async getPoolInformation(tokenAddress: string, fromChainId: number, toChainId: number) {
//     if(!tokenAddress || fromChainId === undefined || toChainId === undefined) {
//         return formatMessage(RESPONSE_CODES.BAD_REQUEST ,"Bad input params. fromChainId, toChainId and tokenAddress are mandatory parameters");
//     }
//     const queryParamMap = new Map();
//     queryParamMap.set("tokenAddress", tokenAddress);
//     queryParamMap.set("fromChainId", fromChainId);
//     queryParamMap.set("toChainId", toChainId);

//     const checkTransferStatusRequest = {
//         method: RequestMethod.GET,
//         baseURL: this.config.getHyphenBaseURL(this.environment),
//         path: this.config.getPoolInfoPath,
//         queryParams: queryParamMap
//     }
//     const response = await makeHttpRequest(checkTransferStatusRequest);
//     return response;
// }