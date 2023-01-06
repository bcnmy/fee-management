import crypto from 'crypto';

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

const randomInteger = (
  min: number,
  max: number,
): number => Math.floor(Math.random() * (max - min + 1)) + min;

const generateTransactionId = (data: string) => {
  const hashData = `0x${crypto.createHash('sha256').update(data + Date.now() + randomInteger(1, 1000)).digest('hex')}`;
  return hashData;
};


export { formatMessage, getTimeInMilliseconds, stringify, sortArrayOfObject, generateTransactionId };