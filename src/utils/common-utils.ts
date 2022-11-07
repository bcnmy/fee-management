const formatMessage = (code: number, message: string) => {
  return {
    code,
    message,
  };
};

const getTimeInMilliseconds = () => {
  return Date.now();
};

const stringify = (Object: any) => {
  return JSON.stringify(Object);
}

function sortArrayOfObject(sortAttribute: string) {
  return function (firstEntry: any, secondEntry: any) {
    if (firstEntry[sortAttribute] > secondEntry[sortAttribute]) {
      return 1;
    } else if (firstEntry[sortAttribute] < secondEntry[sortAttribute]) {
      return -1;
    }
    return 0;
  };
}

export { formatMessage, getTimeInMilliseconds, stringify, sortArrayOfObject };




// function isNumeric(str: string) {
//   try {
//     if (typeof str !== 'string') return false;
//     return !isNaN(parseFloat(str));
//   } catch (e) {
//     return false;
//   }
// }

// const convertTokenAddressesToLowercase = (token: Token): Token => {
//     const newToken = JSON.parse(JSON.stringify(token));
//     for (const [key, value] of Object.entries(token)) {
//         if (isNumeric(key) && typeof value !== "string" && value?.address) {
//             newToken[key].address = value.address.toLowerCase();
//         }
//     }
//     return newToken;
// };
