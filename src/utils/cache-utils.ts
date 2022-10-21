const getGasFeePaidKey = (networkId: number) => {
    return `GasFeePaid_${networkId}`;
};

export {
    getGasFeePaidKey
};
