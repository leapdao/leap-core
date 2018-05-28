import assert from 'assert';
import Util from './util';

// 8 bytes - value, 20 bytes - address
export const OUT_LENGTH = 28;

export default class Output {

  constructor(valueOrObject, address) {
    if (typeof valueOrObject === 'object') {
      this.value = valueOrObject.value;
      this.address = valueOrObject.address;
    } else {
      this.value = valueOrObject;
      this.address = address;
    }
  }

  /* eslint-disable class-methods-use-this */
  getSize() {
    return OUT_LENGTH;
  }
  /* eslint-enable class-methods-use-this */

  toJSON() {
    return {
      address: this.address,
      value: this.value,
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
   * @returns {Output}
   */
  static fromRaw(buf, offset = 0) {
    const value = Util.readUint64(buf, offset);
    const addr = `0x${buf.slice(offset + 8, offset + 28).toString('hex')}`;
    return new Output(value, addr);
  }

  toRaw() {
    const dataBuf = Buffer.alloc(this.getSize());
    Util.writeUint64(dataBuf, this.value, 0);
    dataBuf.write(this.address.replace('0x', ''), 8, 'hex');
    return dataBuf;
  }

}
