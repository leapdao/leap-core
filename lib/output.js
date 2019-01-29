
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import assert from 'assert';
import { BigInt, isBigInt, lessThan } from 'jsbi-utils';

import { toHexString, isNFT } from './util';

// 32 bytes - value, 20 bytes - address, 2 bytes color
export const OUT_LENGTH = 54;

export const MAX_COLOR = 2 ** 16;

const valueHex = value => BigInt(value).toString(16);

const ensureSafeValue = (value) => {
  if (typeof value === 'number' && value > Number.MAX_SAFE_INTEGER) {
    throw new Error("Use JSBI.BigInt or string for large values. Using Number could lead to precision loss");
  }
};

export default class Output {

  constructor(valueOrObject, address, color) {
    if (typeof valueOrObject === 'object' && !isBigInt(valueOrObject)) {
      ensureSafeValue(valueOrObject.value);
      this.value = BigInt(valueOrObject.value);
      this.color = valueOrObject.color;
      this.address = valueOrObject.address;
    } else {
      ensureSafeValue(valueOrObject);
      this.value = BigInt(valueOrObject);
      this.address = address;
      this.color = color;
    }
    if (lessThan(this.value, BigInt(1))) {
      throw new Error('value < 1 not allowed');
    }
    if (this.color < 0 || this.color > MAX_COLOR) {
      throw new Error(`Color out of range (0–${MAX_COLOR})`);
    }
  }

  isNFT() {
    return isNFT(this.color);
  }

  /* eslint-disable class-methods-use-this */
  getSize() {
    // transfer output
    return OUT_LENGTH;
  }
  /* eslint-enable class-methods-use-this */

  toJSON() {
    const rsp = {
      address: this.address,
      value: this.value.toString(10),
      color: this.color,
    };
    return rsp;
  }

  /**
   * Instantiate output from json object.
   * @param {Object} json
   * @returns {Outpoint}
   */
  static fromJSON(json) {
    assert(json, 'Output data is required.');
    return new Output(json);
  }

  /**
   * Instantiate output from serialized data.
   * @param {Buffer} data
   * @param {offset} offset to read from in buffer
   * @returns {Output}
   */
  static fromRaw(buf, offset = 0) {
    const color = buf.readUInt16BE(offset + 32);
    const valueString = toHexString(buf.slice(offset, offset + 32));
    const value = BigInt(valueString);
    const address = toHexString(buf.slice(offset + 34, offset + 54));
    // transfer output
    return new Output(value, address, color);
  }

  toRaw() {
    const dataBuf = Buffer.alloc(this.getSize());
    dataBuf.write(valueHex(this.value).padStart(64, '0'), 0, 32, 'hex');
    dataBuf.writeUInt16BE(this.color, 32);
    dataBuf.write(this.address.replace('0x', ''), 34, 'hex');
    return dataBuf;
  }

}
