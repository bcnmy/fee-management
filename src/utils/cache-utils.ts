const getGasFeePaidKey = (networkId: number) => {
    return `GasFeePaid_${networkId}`;
};

const getHyphenTokenListKey = (networkId: number) => {
    return `HyphenTokenList_${networkId}`;
};

const getOneInchTokenListKey = (networkId: number) => {
    return `OneInchTokenList_${networkId}`;
};

const getAccumulatedFeeObjKey = (networkId: number) => {
    return `accumulatedFeeObj_${networkId}`;
};

export {
    getGasFeePaidKey,
    getHyphenTokenListKey,
    getOneInchTokenListKey,
    getAccumulatedFeeObjKey
};
