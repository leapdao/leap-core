import assert from 'assert';
import encoding from './encoding';
import Util from './util';


// 32 bytes prev tx + 1 byte output pos
export const OUTPOINT_LENGTH = 33;

/*
 * Helpers
 */
function strcmp(a, b) {
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    if (a[i] < b[i]) { return -1; }
    if (a[i] > b[i]) { return 1; }
  }

  if (a.length < b.length) { return -1; }

  if (a.length > b.length) { return 1; }

  return 0;
}

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
  static isOutpoint(obj) {
    return obj instanceof Outpoint;
  }

  /**
   * Test equality against another outpoint.
   * @param {Outpoint} prevout
   * @returns {Boolean}
   */
  equals(prevout) {
    assert(Outpoint.isOutpoint(prevout));
    return this.hash === prevout.hash
      && this.index === prevout.index;
  }

  /**
   * Compare against another outpoint (BIP69).
   * @param {Outpoint} prevout
   * @returns {Number}
   */
  compare(prevout) {
    assert(Outpoint.isOutpoint(prevout));

    const cmp = strcmp(this.txid(), prevout.txid());

    if (cmp !== 0) { return cmp; }

    return this.index - prevout.index;
  }

  /**
   * Get little-endian hash.
   * @returns {Hash}
   */

  txid() {
    return `0x${this.hash.toString('hex')}`;
  }

  /* eslint-disable class-methods-use-this */
  getSize() {
    return OUTPOINT_LENGTH;
  }
  /* eslint-enable class-methods-use-this */

  /**
   * Instantiate outpoint from serialized data.
   * @param {Buffer} data
   * @returns {Outpoint}
   */
  static fromRaw(buf) {
    return new Outpoint(buf.slice(0, 32), buf.readUInt8(32));
  }

  toRaw(buf, offset) {
    const dataBuf = (buf) || Buffer.alloc(this.getSize());
    const off = (offset) || 0;
    this.hash.copy(dataBuf, 0 + off);
    dataBuf.writeUInt8(this.index, 32 + off);
    return dataBuf;
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
