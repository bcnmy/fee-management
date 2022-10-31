let config: any = {};
const erc20Abi = require('./abi/erc20.abi.json');
const hyphenBridgeAbi = require('./abi/hyphen.abi.json');
config.erc20Abi = erc20Abi;
config.hyphenBridgeAbi = hyphenBridgeAbi;

const NATIVE_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
config.NATIVE_ADDRESS = NATIVE_ADDRESS;

config.oneInchApiBaseUrl = "https://api.1inch.io/v4.0/";
config.hyphenBaseUrl = "https://hyphen-v2-api.biconomy.io/api/v1/"
config.hyphenSupportedTokenEndpoint = "admin/supported-token/list"
config.hyphenTransferFeeEndpoint = "data/transferFee"

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
  COMPLETE: "COMPLETE" 
}

config.NATIVE_TOKEN_SYMBOL = {
  1: "ETH",
  137: "MATIC",
  56: "BNB"
}

export { NATIVE_ADDRESS, RESPONSE_CODES, EXIT_STATUS, SIGNATURE_TYPES, FEE_CONVERSION_DB_STATUSES, config };
