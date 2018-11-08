
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import assert from 'assert';
import BN from 'bn.js';

// 32 bytes - value, 20 bytes - address, 2 bytes color
export const OUT_LENGTH = 54;

export const MAX_COLOR = 2 ** 16;

const valueHex = value => (
  (typeof value === 'string' ? new BN(value, 10) : new BN(value)).toString(16)
);

export default class Output {

  constructor(valueOrObject, address, color) {
    if (typeof valueOrObject === 'object') {
      this.value = valueOrObject.value;
      this.color = valueOrObject.color;
      this.address = valueOrObject.address;
    } else {
      this.value = valueOrObject;
      this.address = address;
      this.color = color;
    }

    if (this.color < 0 || this.color > MAX_COLOR) {
      throw new Error(`Color out of range (0–${MAX_COLOR})`);
    }
  }

  isNFT() {
    return Output.isNFT(this.color);
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
      value: this.value,
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
    // const value = readUint64(buf, offset);
    // console.log('from', buf.slice(0, 32).toString('hex'));
    const color = buf.readUInt16BE(offset + 32);
    const valueString = buf.slice(offset, offset + 32).toString('hex');
    const value = (
      Output.isNFT(color)
        ? new BN(valueString, 16).toString(10)
        : parseInt(valueString, 16)
    );
    const address = `0x${buf.slice(offset + 34, offset + 54).toString('hex')}`;
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

  static isNFT(color) {
    return color > 2 ** 15;
  }

}
