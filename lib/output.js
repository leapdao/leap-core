import assert from 'assert';
import { writeUint64, readUint64 } from './util';

// 8 bytes - value, 20 bytes - address
export const OUT_LENGTH = 28;

export default class Output {

  constructor(valueOrObject, address) {
    if (typeof valueOrObject === 'object') {
      // transfer output
      if (valueOrObject.address) {
        this.value = valueOrObject.value;
        this.address = valueOrObject.address;
        if (valueOrObject.storageRoot) {
          this.storageRoot = valueOrObject.storageRoot;
        }
      } else { // computation request output
        this.value = valueOrObject.value;
        this.gasPrice = valueOrObject.gasPrice;
        // msgData is already buffer
        if (Buffer.isBuffer(valueOrObject.msgData)) {
          this.msgData = valueOrObject.msgData;
        } else { // msgData is yet string
          const dataHex = valueOrObject.msgData.replace('0x', '');
          const dataBuf = Buffer.alloc(dataHex.length / 2);
          dataBuf.write(dataHex, 'hex');
          this.msgData = dataBuf;
        }
      }
    } else {
      this.value = valueOrObject;
      this.address = address;
    }
  }

  /* eslint-disable class-methods-use-this */
  getSize() {
    // transfer output
    if (this.address) {
      if (this.storageRoot) {
        return OUT_LENGTH + 32;
      }
      return OUT_LENGTH;
    }
    // computation request output
    return (OUT_LENGTH - 14) + this.msgData.length;
  }
  /* eslint-enable class-methods-use-this */

  toJSON() {
    // transfer output
    if (this.address) {
      const rsp = {
        address: this.address,
        value: this.value,
      };
      if (this.storageRoot) {
        rsp.storageRoot = this.storageRoot;
      }
      return rsp;
    }
    // computation request output
    return {
      value: this.value,
      msgData: `0x${this.msgData.toString('hex')}`,
      gasPrice: this.gasPrice,
    };
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
    // computation request output
    if (isComp === 1) {
      const gasPrice = buf.readUInt32BE(offset + 8);
      const length = buf.readUInt16BE(offset + 12);
      if (offset + 14 + length > buf.length) {
        throw new Error('Length out of bounds.');
      }
      const msgData = Buffer.alloc(length);
      buf.copy(msgData, 0, offset + 14, offset + 14 + length);
      return new Output({
        value,
        msgData,
        gasPrice,
      });
    }
    const address = `0x${buf.slice(offset + 8, offset + 28).toString('hex')}`;
    if (isComp === 2) {
      if (offset + 60 > buf.length) {
        throw new Error('Length out of bounds.');
      }
      const storageRoot = `0x${buf.slice(offset + 28, offset + 60).toString('hex')}`;
      return new Output({
        value,
        address,
        storageRoot,
      });
    }
    // transfer output
    return new Output(value, address);
  }

  toRaw() {
    const dataBuf = Buffer.alloc(this.getSize());
    writeUint64(dataBuf, this.value, 0);
    // transfer output
    if (this.address) {
      dataBuf.write(this.address.replace('0x', ''), 8, 'hex');
      if (this.storageRoot) {
        dataBuf.write(this.storageRoot.replace('0x', ''), 28, 'hex');
      }
    } else { // computation request output
      dataBuf.writeUInt32BE(this.gasPrice, 8);
      dataBuf.writeUInt16BE(this.msgData.length, 12);
      this.msgData.copy(dataBuf, 14, 0, this.msgData.length);
    }
    return dataBuf;
  }

}
