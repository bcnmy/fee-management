let config: any = {};
import LIQUIDITY_POOL_MANAGER_ABI from "./abi/liquidityPoolAbi";
import ERC20_ABI from "./abi/erc20Abi";

const erc20Abi = ERC20_ABI;
const hyphenBridgeAbi = LIQUIDITY_POOL_MANAGER_ABI;
config.erc20Abi = erc20Abi;
config.hyphenBridgeAbi = hyphenBridgeAbi;

const NATIVE_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
config.NATIVE_ADDRESS = NATIVE_ADDRESS;
config.INFINITE_APPROVAL_AMOUNT = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

config.oneInchApiBaseUrl = "https://api.1inch.io/v4.0/";
config.hyphenBaseUrl = "https://hyphen-v2-api.biconomy.io/api/v1/";
config.hyphenSupportedTokenEndpoint = "admin/supported-token/list";
config.hyphenTransferFeeEndpoint = "data/transferFee";

const RESPONSE_CODES = {
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

const EXIT_STATUS = {
  PROCESSING: 1,
  PROCESSED: 2,
  FAILED: 3,
};

const SIGNATURE_TYPES = {
  EIP712: "EIP712_SIGN",
  PERSONAL: "PERSONAL_SIGN",
};

const FEE_CONVERSION_DB_STATUSES = {
  PEDNING: "PEDNING",
  PROCESSING: "PROCESSING",
  FAILED: "FAILED",
  COMPLETE: "COMPLETE",
};

config.NATIVE_TOKEN_SYMBOL = {
  1: "ETH",
  137: "MATIC",
  56: "BNB",
};

config.blockConfimration = {
  1: 30,
  137: 50,
  56: 20,
};

export { NATIVE_ADDRESS, RESPONSE_CODES, EXIT_STATUS, SIGNATURE_TYPES, FEE_CONVERSION_DB_STATUSES, config };
