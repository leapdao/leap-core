
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import assert from 'assert';
import ethUtils from 'ethereumjs-util';
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
   * Test an object to see if it is an outpoint.  This check was previously
   * done using `instanceof`. However, this lead to problems where two
   * instances of leap-core would become incompatible, as they compared two
   * different instantiations of `Outpoints` with each other. We're now
   * resorting to duck-typing instead.
   *
   * @param {Object} obj
   * @returns {Boolean}
   */
  static isOutpoint(obj) {
    // NOTE: We're checking obj.index for typeof "undefined" as it
    // can become 0 (zero).
    return obj && obj.hash && typeof obj.index !== "undefined";
  }

  /**
   * Test equality against another outpoint.
   * @param {Outpoint} prevout
   * @returns {Boolean}
   */
  equals(prevout) {
    assert(Outpoint.isOutpoint(prevout));
    return this.hash.equals(prevout.hash)
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

  getUtxoId() {
    const dataBuf = Buffer.alloc(32);
    this.hash.copy(dataBuf, 0);
    dataBuf.writeInt32BE(0, 0);
    dataBuf.writeInt32BE(0, 4);
    dataBuf.writeInt32BE(0, 8);
    dataBuf.writeInt32BE(0, 12);
    dataBuf.writeUInt8(this.index, 16);
    return Util.toHexString(dataBuf);
  }

  /**
   * Instantiate outpoint from serialized data.
   * @param {Buffer} data
   * @returns {Outpoint}
   */
  static fromRaw(raw, offset = 0) {
    let dataBuf = raw;
    if (!Buffer.isBuffer(raw)) {
      const dataHex = raw.replace('0x', '');
      dataBuf = Buffer.alloc(dataHex.length / 2);
      dataBuf.write(dataHex, 'hex');
    }
    return new Outpoint(dataBuf.slice(0 + offset, 32 + offset), dataBuf.readUInt8(32 + offset));
  }

  toRaw(buf, offset) {
    const dataBuf = (buf) || Buffer.alloc(this.getSize());
    const off = (offset) || 0;
    this.hash.copy(dataBuf, 0 + off);
    dataBuf.writeUInt8(this.index, 32 + off);
    return dataBuf;
  }

  // Returns serialized tx bytes as hex string
  hex() {
    return Util.toHexString(this.toRaw());
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

  toJSON() {
    return {
      hash: ethUtils.bufferToHex(this.hash),
      index: this.index,
    };
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
