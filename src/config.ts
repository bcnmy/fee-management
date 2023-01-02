let config: any = {};
import LIQUIDITY_POOL_MANAGER_ABI from "./abi/liquidityPoolAbi";
import ERC20_ABI from "./abi/erc20Abi";

const erc20Abi = ERC20_ABI;
const hyphenBridgeAbi = LIQUIDITY_POOL_MANAGER_ABI;
config.erc20Abi = erc20Abi;
config.hyphenBridgeAbi = hyphenBridgeAbi;

config.NATIVE_ADDRESS_RELAYER = "0x0000000000000000000000000000000000000000";
config.NATIVE_ADDRESS_ROUTER = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
config.INFINITE_APPROVAL_AMOUNT = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

config.oneInchApiBaseUrl = "https://api.1inch.io/v4.0/";
config.hyphenBaseUrl = "https://hyphen-v2-api.biconomy.io/api/v1/";
config.hyphenSupportedTokenEndpoint = "admin/supported-token/list";
config.hyphenTransferFeeEndpoint = "data/transferFee";

config.RESPONSE_CODES = {
  ERROR_RESPONSE: 500,
  OK: 144,
  ALREADY_EXISTS: 145,
  UNSUPPORTED_TOKEN: 146,
  NO_LIQUIDITY: 148,
  UNSUPPORTED_NETWORK: 149,
  ALLOWANCE_NOT_GIVEN: 150,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  SUCCESS: 200,
  EXPECTATION_FAILED: 417,
};

config.FEE_CONVERSION_DB_STATUSES = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  FAILED: "FAILED",
  COMPLETE: "COMPLETE",
};


config.getHyphenTokenListKeyExpiry = 7200000 // 2 hours
config.oneInchTokenListExpiry = 7200000 // 2 hours
config.accumulatedFeeObjKeyExpiry = 7200000 // 2 hours

config.cache = {
  SCW_LOCK_TTL: 6000000
}

config.uniswapRouterAddress = {
  5: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  80001: "0x8954AfA98594b838bda56FE4C12a09D7739D179b",
  43113: "0x688d21b0B8Dc35971AF58cFF1F7Bf65639937860",
  97: "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3",
  4002: "0xa6AD18C2aC47803E193F75c3677b14BF19B94883"
}

export { config };
