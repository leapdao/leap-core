
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import assert from 'assert';

import Util from './util';

// 32 bytes - value, 20 bytes - address, 2 bytes color
export const OUT_LENGTH = 54;

// 32 - data, + normal output like above
export const NST_OUT_LENGTH = OUT_LENGTH + 32;

export const MAX_COLOR = 2 ** 16;

const valueHex = value => BigInt(value).toString(16);

export default class Output {

  constructor(valueOrObject, address, color, data) {
    if (typeof valueOrObject === 'object') {
      Util.ensureSafeValue(valueOrObject.value);
      this.value = BigInt(valueOrObject.value);
      this.color = valueOrObject.color || 0;
      this.address = valueOrObject.address;

      if (this.isNST()) {
        this.data = valueOrObject.data;
      }
    } else {
      Util.ensureSafeValue(valueOrObject);
      this.value = BigInt(valueOrObject);
      this.address = address;
      this.color = color || 0;

      if (this.isNST()) {
        this.data = data;
      }
    }
    if (!this.isNFT() && !this.isNST() && this.value < 1n) {
      throw new Error('Output value is < 1');
    }
    if (this.color < 0 || this.color > MAX_COLOR) {
      throw new Error(`Color out of range (0–${MAX_COLOR})`);
    }
    if (this.isNST() && !Util.isBytes32(this.data)) {
      throw new Error('data is not a 32 bytes hex string');
    }
  }

  isNFT() {
    return Util.isNFT(this.color);
  }

  isNST() {
    return Util.isNST(this.color);
  }

  /* eslint-disable class-methods-use-this */
  getSize() {
    // transfer output
    return this.isNST() ? NST_OUT_LENGTH : OUT_LENGTH;
  }
  /* eslint-enable class-methods-use-this */

  toJSON() {
    const rsp = {
      address: this.address,
      value: this.value.toString(10),
      color: this.color,
    };

    if (this.isNST()) {
      rsp.data = this.data;
    }

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
    const valueString = Util.toHexString(buf.slice(offset, offset + 32));
    const value = BigInt(valueString);
    const address = Util.toHexString(buf.slice(offset + 34, offset + 54));

    let data;
    if (Util.isNST(color)) {
      data = Util.toHexString(buf.slice(offset + 54, offset + 54 + 32));
    }

    // transfer output
    return new Output(value, address, color, data);
  }

  toRaw() {
    const dataBuf = Buffer.alloc(this.getSize());
    dataBuf.write(valueHex(this.value).padStart(64, '0'), 0, 32, 'hex');
    dataBuf.writeUInt16BE(this.color, 32);
    dataBuf.write(this.address.replace('0x', ''), 34, 'hex');

    if (this.isNST()) {
      dataBuf.write(this.data.replace('0x', ''), 54, 'hex');
    }

    return dataBuf;
  }

}
