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

export { formatMessage, getTimeInMilliseconds, stringify };




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
