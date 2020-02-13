
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import assert from 'assert';

export default class Util {

  /**
   * Test whether an object is a uint.
   * @param {Number?} value
   * @returns {Boolean}
   */
  static isUint(value) {
    return Util.isInt(value) && value >= 0;
  }

  /**
   * Test whether an object is a uint8.
   * @param {Number?} value
   * @returns {Boolean}
   */
  static isU8(value) {
    return (value & 0xff) === value; // eslint-disable-line no-bitwise
  }

  /**
   * Test whether an object is a uint16.
   * @param {Number?} value
   * @returns {Boolean}
   */

  static isU16(value) {
    return (value & 0xffff) === value; // eslint-disable-line no-bitwise
  }

  /**
   * Test whether an object is a uint32.
   * @param {Number?} value
   * @returns {Boolean}
   */

  static isU32(value) {
    return (value >>> 0) === value; // eslint-disable-line no-bitwise
  }

  /**
   * Test whether an object is a uint53.
   * @param {Number?} value
   * @returns {Boolean}
   */

  static isU64(value) {
    return Util.isUint(value);
  }

/**
 * Test whether a string is a plain
 * ascii string (no control characters).
 * @param {String} str
 * @returns {Boolean}
 */

  /**
   * Find index of a buffer in an array of buffers.
   * @param {Buffer[]} items
   * @param {Buffer} data - Target buffer to find.
   * @returns {Number} Index (-1 if not found).
   */

  static indexOf(items, data) {
    assert(Array.isArray(items));
    assert(Buffer.isBuffer(data));

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      assert(Buffer.isBuffer(item));

      if (item.equals(data)) { return i; }
    }

    return -1;
  }

  /**
   * Test to see if a string starts with a prefix.
   * @param {String} str
   * @param {String} prefix
   * @returns {Boolean}
   */

  static startsWith(str, prefix) {
    assert(typeof str === 'string');

    if (!str.startsWith) { return str.indexOf(prefix) === 0; }

    return str.startsWith(prefix);
  }

  /**
   * Test whether a string is hex (length must be even).
   * Note that this _could_ await a false positive on
   * base58 strings.
   * @param {String?} str
   * @returns {Boolean}
   */

  static isBytes(str) {
    if (typeof str !== 'string') { return false; }
    const trunk = (str.indexOf('0x') === 0) ? str.substring(2, str.length) : str;
    return str.length % 2 === 0 && /^[0-9A-Fa-f]+$/.test(trunk);
  }

  /**
   * Test whether an object is a 256 bit hash (hex string).
   * @param {String?} hash
   * @returns {Boolean}
   */

  static isBytes32(hash) {
    if (typeof hash !== 'string') { return false; }
    const trunk = (hash.indexOf('0x') === 0) ? hash.substring(2, hash.length) : hash;
    return trunk.length === 64 && Util.isBytes(trunk);
  }

  static writeUint64(buff, value, offset = 0) {
    const big = ~~(value / 0xFFFFFFFF); // eslint-disable-line no-bitwise
    buff.writeUInt32BE(big, offset);
    const low = (value % 0xFFFFFFFF) - big;
    buff.writeUInt32BE(low, offset + 4);
  }

  static readUint64(buff, offset = 0) {
    return BigInt(Util.toHexString(buff.slice(offset, offset + 8)), 16);
  }

  static arrayToRaw(arr) {
    // todo: possible performance improvement if totalLength supplied to Buffer.concat
    return Buffer.concat(arr.map(v => v.toRaw()));
  }

  static toHexString(buffer) {
    return `0x${buffer.toString('hex')}`;
  }

  /**
   * Returns an array of numbers in the given interval.
   *
   * @param {Number} from left bound of the interval
   * @param {Number} to right bound of the interval
   * @returns {Array}
   */
  static range(from, to) {
    return Array.from(new Array((to - from) + 1), (_, i) => i + from);
  }

  static isNFT(color) {
    return (color > (2 ** 15)) && (color <= ((2 ** 15) + (2 ** 14)));
  }

  static isNST(color) {
    return color > ((2 ** 15) + (2 ** 14));
  }

  static ensureSafeValue(value) {
    if (typeof value === 'number' && value > Number.MAX_SAFE_INTEGER) {
      throw new Error("Use JSBI.BigInt or string for large values. Using Number could lead to precision loss");
    }
  };

  static jsonToBigInt(key, val) {
    if (typeof val !== "string") return val;
    
    const m = val.match(/(\d+)n/);
    if (m) return BigInt(m[1]);
    
    return val;
  };
  
  static bigIntToJson(val) {
    return `${val.toString()}n`;
  }

  /**
   * Parse given JSON string assuming all the BigInts in the JSON are encoded as a string literal.
   * E.g. '12n' in a source becomes a BigInt(12) in a result.
   * @param {string} value 
   */
  static fromJSON(value) {
    return JSON.parse(value, Util.jsonToBigInt);
  }

  /**
   * Convert givert object into JSON string. BigInt objects are converted to string literals
   * E.g. both BigInt(12) and 12n will be converted to '12n'
   * @param {*} obj 
   */
  static toJSON(obj) {
    const prevHandler = BigInt.prototype.toJSON;
    /* eslint-disable-next-line no-extend-native, func-names */
    BigInt.prototype.toJSON = function() { return Util.bigIntToJson(this); }
    const result = JSON.stringify(obj);
    /* eslint-disable-next-line no-extend-native */
    BigInt.prototype.toJSON = prevHandler;
    return result;
  }

}
