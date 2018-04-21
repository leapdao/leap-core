import assert from 'assert';
import encoding from './encoding';
import Util from './util';


export default class Outpoint {
  constructor(hash, index) {
    if (hash) {
      if (typeof hash === 'string') {
        assert(Util.isBytes32(hash), 'Hash must be hex256.');
        this.hash = Buffer.from(hash.replace('0x', ''), 'hex');
      }
      if (Buffer.isBuffer(hash)) {
        assert(hash.length === 32, 'Hash buffer length must be 32 bytes.');
        this.hash = hash;
      }
      assert(this.hash, 'Hash must be string or Buffer.');
      assert(Util.isU8(index), 'Index must be a uint8.');
      this.index = index;
    } else {
      this.hash = encoding.ZERO_HASH;  
    }
  }

  /**
   * Test an object to see if it is an outpoint.
   * @param {Object} obj
   * @returns {Boolean}
   */
  isOutpoint(obj) {
    return obj instanceof Outpoint;
  }

  /**
   * Test equality against another outpoint.
   * @param {Outpoint} prevout
   * @returns {Boolean}
   */
  equals(prevout) {
    assert(this.isOutpoint(prevout));
    return this.hash === prevout.hash
      && this.index === prevout.index;
  }

  /**
   * Get little-endian hash.
   * @returns {Hash}
   */

  txid() {
    return `0x${this.hash.toString('hex')}`;
  }

  /**
   * Calculate size of outpoint.
   * @returns {Number}
   */

  getSize() {
    return 33;
  }

  /**
   * Instantiate outpoint from serialized data.
   * @param {Buffer} data
   * @returns {Outpoint}
   */
  static fromRaw(buf) {
    return new Outpoint(buf.slice(0, 32), buf.readUInt8(32));
  }

  /**
   * Instantiate outpoint from json object.
   * @param {Object} json
   * @returns {Outpoint}
   */
  static fromJSON(json) {
    assert(json, 'Outpoint data is required.');
    return new Outpoint(json.hash, json.index);
  }

  /**
   * Inject properties from tx.
   * @private
   * @param {TX} tx
   * @param {Number} index
   */
  static fromTX(tx, index) {
    assert(tx);
    assert(typeof index === 'number');
    assert(index >= 0);
    return new Outpoint(tx.hash('hex'), index);
  }
}