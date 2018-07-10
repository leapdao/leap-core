
/**
 * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import assert from 'assert';
import { writeUint64, readUint64 } from './util';

// 8 bytes - value, 20 bytes - address, 2 bytes color
export const OUT_LENGTH = 30;

export default class Output {

  constructor(valueOrObject, address, color) {
    if (typeof valueOrObject === 'object') {
      if (valueOrObject.address) {
        this.value = valueOrObject.value;
        this.color = valueOrObject.color;
        this.address = valueOrObject.address;

        if (valueOrObject.storageRoot) { // computation response output
          this.storageRoot = valueOrObject.storageRoot;
        }

        if (valueOrObject.msgData) { // computation request output
          this.gasPrice = valueOrObject.gasPrice;
          if (Buffer.isBuffer(valueOrObject.msgData)) { // msgData is already buffer
            this.msgData = valueOrObject.msgData;
          } else { // msgData is yet string
            const dataHex = valueOrObject.msgData.replace('0x', '');
            const dataBuf = Buffer.alloc(dataHex.length / 2);
            dataBuf.write(dataHex, 'hex');
            this.msgData = dataBuf;
          }
        }
      }
    } else {
      this.value = valueOrObject;
      this.address = address;
      this.color = color;
    }
  }

  /* eslint-disable class-methods-use-this */
  getSize() {
    if (this.storageRoot) {
      return OUT_LENGTH + 32;
    }
    // computation request output
    if (this.msgData) {
      return (OUT_LENGTH + 6) + this.msgData.length;
    }
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
    if (this.storageRoot) {
      rsp.storageRoot = this.storageRoot;
    }
    if (this.msgData) {
      rsp.msgData = `0x${this.msgData.toString('hex')}`;
      rsp.gasPrice = this.gasPrice;
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
   * @param {isComp} flag where 0 is transfer output,
   *                            1 is comp request
   *                            2 is comp response
   * @returns {Output}
   */
  static fromRaw(buf, offset = 0, isComp = 0) {
    const value = readUint64(buf, offset);
    const color = buf.readUInt16BE(offset + 8);
    const address = `0x${buf.slice(offset + 10, offset + 30).toString('hex')}`;
    // computation request output
    if (isComp === 1) {
      const gasPrice = buf.readUInt32BE(offset + 30);
      const length = buf.readUInt16BE(offset + 34);
      if (offset + 36 + length > buf.length) {
        throw new Error('Length out of bounds.');
      }
      const msgData = Buffer.alloc(length);
      buf.copy(msgData, 0, offset + 36, offset + 36 + length);
      return new Output({
        value,
        color,
        address,
        msgData,
        gasPrice,
      });
    }
    if (isComp === 2) {
      if (offset + 62 > buf.length) {
        throw new Error('Length out of bounds.');
      }
      const storageRoot = `0x${buf.slice(offset + 30, offset + 62).toString('hex')}`;
      return new Output({
        value,
        color,
        address,
        storageRoot,
      });
    }
    // transfer output
    return new Output(value, address, color);
  }

  toRaw() {
    const dataBuf = Buffer.alloc(this.getSize());
    writeUint64(dataBuf, this.value, 0);
    dataBuf.writeUInt16BE(this.color, 8);
    dataBuf.write(this.address.replace('0x', ''), 10, 'hex');
    
     // computation request output
    if (this.msgData) {
      dataBuf.writeUInt32BE(this.gasPrice, 30);
      dataBuf.writeUInt16BE(this.msgData.length, 34);
      this.msgData.copy(dataBuf, 36, 0, this.msgData.length);
    } else { // transfer output
      if (this.storageRoot) {
        dataBuf.write(this.storageRoot.replace('0x', ''), 30, 'hex');
      }
    }
    return dataBuf;
  }

}
