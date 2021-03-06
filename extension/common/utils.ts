import WIF = require('wif');
import { ec } from 'elliptic';
import base58 = require('bs58');
import BN = require('bn.js');

import SHA256 =  require('crypto-js/sha256');
import hexEncoding = require('crypto-js/enc-hex');
const curve = new ec('p256');


const hexRegex = /^([0-9A-Fa-f]{2})*$/;

export const getMessageID = () => {
    const rand = Math.floor(Math.random() * 999999);
    const myDate = new Date();
    const messageId = myDate.getTime() + '' + rand;
    return messageId;
}

export function getPrivateKeyFromWIF(wif) {
    return ab2hexstring(WIF.decode(wif, 128).privateKey);
}

export function getPublicKeyFromPrivateKey(privateKey, encode = true) {
    const privateKeyBuffer = Buffer.from(privateKey, 'hex');
    const keypair = curve.keyFromPrivate(privateKeyBuffer, 'hex');
    const unencodedPubKey = (keypair.getPublic() as any).encode('hex');
    if (encode) {
        const tail = parseInt(unencodedPubKey.substr(64 * 2, 2), 16);
        if (tail % 2 === 1) {
            return '03' + unencodedPubKey.substr(2, 64);
        } else {
            return '02' + unencodedPubKey.substr(2, 64);
        }
    } else {
        return unencodedPubKey;
    }
}

export function getScriptHashFromAddress(address) {
    const hash = ab2hexstring(base58.decode(address));
    return reverseHex(hash.substr(2, 40));
}


export function sign(hex, privateKey) {
    const msgHash = sha256(hex);
    const msgHashHex = Buffer.from(msgHash, 'hex');
    const privateKeyBuffer = Buffer.from(privateKey, 'hex');
    const sig = curve.sign(msgHashHex, privateKeyBuffer);
    return sig.r.toString('hex', 32) + sig.s.toString('hex', 32);
}

export function verify(hex, sig, publicKey) {
    if (!isPublicKey(publicKey, true)) {
        publicKey = getPublicKeyUnencoded(publicKey);
    }
    const sigObj = getSignatureFromHex(sig);
    const messageHash = sha256(hex);
    const publicKeyBuffer = Buffer.from(publicKey, 'hex');
    return curve.verify(messageHash, sigObj, publicKeyBuffer, 'hex');
}

/**
 * Converts signatureHex to a signature object with r & s.
 */
function getSignatureFromHex(signatureHex) {
    const signatureBuffer = Buffer.from(signatureHex, 'hex');
    const r = new BN(signatureBuffer.slice(0, 32).toString('hex'), 16, 'be');
    const s = new BN(signatureBuffer.slice(32).toString('hex'), 16, 'be');
    return { r, s };
}

export function reverseHex(hex) {
    ensureHex(hex);
    let out = '';
    for (let i = hex.length - 2; i >= 0; i -= 2) {
        out += hex.substr(i, 2);
    }
    return out;
}

export function ensureHex(str) {
    if (!isHex(str)) {
        throw new Error(`Expected a hexstring but got ${str}`);
    }
}

export function isHex(str) {
    try {
        return hexRegex.test(str);
    } catch (err) {
        return false;
    }
}

/**
 * Performs a single SHA256.
 */
export function sha256(hex) {
    return hash(hex, SHA256);
}

function hash(hex, hashingFunction) {
    const hexEncoded = hexEncoding.parse(hex);
    const result = hashingFunction(hexEncoded);
    return result.toString(hexEncoding);
}


/**
 * @param str ASCII string
 * @returns
 */
export function str2ab(str) {
    if (typeof str !== 'string') {
        throw new Error(`str2ab expected a string but got ${typeof str} instead.`);
    }
    const result = new Uint8Array(str.length);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        result[i] = str.charCodeAt(i);
    }
    return result;
}

/**
 * @param arr
 * @returns HEX string
 */
export function ab2hexstring(arr) {
    if (typeof arr !== 'object') {
        throw new Error(`ab2hexstring expects an array. Input was ${arr}`);
    }
    let result = '';
    const intArray = new Uint8Array(arr);
    for (const i of intArray) {
        let str = i.toString(16);
        str = str.length === 0 ? '00' : str.length === 1 ? '0' + str : str;
        result += str;
    }
    return result;
}

/**
 * @param str ASCII string
 * @returns HEX string
 */
export function str2hexstring(str) {
    return ab2hexstring(str2ab(str));
}

/**
 * @param str HEX string
// tslint:disable-next-line: jsdoc-format
// tslint:disable-next-line: jsdoc-format
// tslint:disable-next-line: no-redundant-jsdoc
 * @returns
 */
export function hexstring2ab(str) {
    ensureHex(str);
    if (!str.length) {
        return new Uint8Array(0);
    }
    const iters = str.length / 2;
    const result = new Uint8Array(iters);
    for (let i = 0; i < iters; i++) {
        result[i] = parseInt(str.substring(0, 2), 16);
        str = str.substring(2);
    }
    return result;
}

export function hexstring2str(hexstring) {
    return ab2str(hexstring2ab(hexstring));
}

/**
 * @param buf ArrayBuffer
 * @returns ASCII string
 */
export function ab2str(buf) {
    return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
}

/**
 * Encodes a public key.
 * @param unencodedKey unencoded public key
 * @return encoded public key
 */
export function getPublicKeyEncoded(unencodedKey) {
    const publicKeyArray = new Uint8Array(hexstring2ab(unencodedKey));
    if (publicKeyArray[64] % 2 === 1) {
        return '03' + ab2hexstring(publicKeyArray.slice(1, 33));
    }
    else {
        return '02' + ab2hexstring(publicKeyArray.slice(1, 33));
    }
}

/**
 * Unencodes a public key.
 * @param  publicKey Encoded public key
 * @return decoded public key
 */
export function getPublicKeyUnencoded(publicKey) {
    const publicKeyBuffer = Buffer.from(publicKey, 'hex');
    const keyPair = curve.keyFromPublic(publicKeyBuffer, 'hex');
    return keyPair.getPublic().encode('hex', true);
}

/**
 * Checks if hexstring is a valid Public Key. Accepts both encoded and unencoded forms.
 * @param key
 * @param  encoded Optional parameter to specify for a specific form. If this is omitted,
 * this function will return true for both forms. If this parameter is provided, this function will only return true for the specific form.
 */
export function isPublicKey(key, encoded) {
    try {
        let encodedKey;
        switch (key.substr(0, 2)) {
            case '04':
                if (encoded === true) {
                    return false;
                }
                // Encode key
                encodedKey = getPublicKeyEncoded(key);
                break;
            case '02':
            case '03':
                if (encoded === false) {
                    return false;
                }
                encodedKey = key;
                break;
            default:
                return false;
        }
        const unencoded = getPublicKeyUnencoded(encodedKey);
        const tail = parseInt((unencoded as any).substr(unencoded.length - 2, 2), 16);
        if (encodedKey.substr(0, 2) === '02' && tail % 2 === 0) {
            return true;
        }
        if (encodedKey.substr(0, 2) === '03' && tail % 2 === 1) {
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

/**
 * Converts a number to a big endian hexstring of a suitable size, optionally little endian
 * @param num A positive integer.
 * @param size The required size in bytes, eg 1 for Uint8, 2 for Uint16. Defaults to 1.
 * @param littleEndian Encode the hex in little endian form
 */
export function num2hexstring(
  num: number,
  size = 1,
  littleEndian = false
): string {
  if (typeof num !== "number") {
    throw new Error(
      `num2hexstring expected a number but got ${typeof num} instead.`
    );
  }
  if (num < 0) {
    throw new RangeError(
      `num2hexstring expected a positive integer but got ${num} instead.`
    );
  }
  if (size % 1 !== 0) {
    throw new Error(
      `num2hexstring expected a positive integer but got ${num} instead.`
    );
  }
  if (!Number.isSafeInteger(num)) {
    throw new RangeError(
      `num2hexstring expected a safe integer but got ${num} instead.`
    );
  }
  size = size * 2;
  let hexstring = num.toString(16);
  hexstring =
    hexstring.length % size === 0
      ? hexstring
      : ("0".repeat(size) + hexstring).substring(hexstring.length);
  if (littleEndian) {
    hexstring = reverseHex(hexstring);
  }
  return hexstring;
}

/**
 * Converts a number to a variable length Int. Used for array length header
 * @param num
 * @returns hexstring of int.
 */
export function num2VarInt(num: number): string {
  if (num < 0xfd) {
    return num2hexstring(num);
  } else if (num <= 0xffff) {
    // uint16
    return "fd" + num2hexstring(num, 2, true);
  } else if (num <= 0xffffffff) {
    // uint32
    return "fe" + num2hexstring(num, 4, true);
  } else {
    // uint64
    return "ff" + num2hexstring(num, 8, true);
  }
}
