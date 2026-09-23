import CryptoJS from "crypto-js";

const DEFAULT_SECRET = process.env.REACT_APP_AI_PROVIDER_SECRET_KEY || "Local@dmin";
const SALT_SIZE_BYTES = 16;
const IV_SIZE_BYTES = 16;
const PBKDF2_ITERATIONS = 100000;

const getPassphrase = () => DEFAULT_SECRET;

const sliceWordArray = (wordArray, startByte, byteLength) => {
  const startWord = Math.floor(startByte / 4);
  const endWord = Math.ceil((startByte + byteLength) / 4);
  return CryptoJS.lib.WordArray.create(
    wordArray.words.slice(startWord, endWord),
    byteLength,
  );
};

export const encryptAiSecret = (plainText) => {
  if (plainText === undefined || plainText === null || plainText === "") {
    return plainText;
  }

  const salt = CryptoJS.lib.WordArray.random(SALT_SIZE_BYTES);
  const iv = CryptoJS.lib.WordArray.random(IV_SIZE_BYTES);
  const key = CryptoJS.PBKDF2(getPassphrase(), salt, {
    keySize: 32 / 4,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });

  const encrypted = CryptoJS.AES.encrypt(String(plainText), key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return CryptoJS.enc.Base64.stringify(
    salt.clone().concat(iv).concat(encrypted.ciphertext),
  );
};

export const decryptAiSecret = (cipherText) => {
  if (cipherText === undefined || cipherText === null || cipherText === "") {
    return cipherText;
  }

  const buffer = CryptoJS.enc.Base64.parse(String(cipherText));
  const salt = sliceWordArray(buffer, 0, SALT_SIZE_BYTES);
  const iv = sliceWordArray(buffer, SALT_SIZE_BYTES, IV_SIZE_BYTES);
  const encrypted = CryptoJS.lib.WordArray.create(
    buffer.words.slice((SALT_SIZE_BYTES + IV_SIZE_BYTES) / 4),
    buffer.sigBytes - SALT_SIZE_BYTES - IV_SIZE_BYTES,
  );

  const key = CryptoJS.PBKDF2(getPassphrase(), salt, {
    keySize: 32 / 4,
    iterations: PBKDF2_ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });

  const decrypted = CryptoJS.AES.decrypt({ ciphertext: encrypted }, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return decrypted.toString(CryptoJS.enc.Utf8);
};

export const maskAiSecret = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const text = String(value);
  if (text.length <= 8) {
    return `${text.slice(0, 2)}••••${text.slice(-2)}`;
  }

  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
};