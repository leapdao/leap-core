/**
 *    Copyright (C) 2018 Parsec Labs (parseclabs.org)
 *
 *    This program is free software: you can redistribute it and/or  modify
 *    it under the terms of the GNU Affero General Public License, version 3,
 *    as published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *    As a special exception, the copyright holders give permission to link the
 *    code of portions of this program with the OpenSSL library under certain
 *    conditions as described in each individual source file and distribute
 *    linked combinations including the program with the OpenSSL library. You
 *    must comply with the GNU Affero General Public License in all respects for
 *    all of the code used other than as permitted herein. If you modify file(s)
 *    with this exception, you may extend this exception to your version of the
 *    file(s), but you are not obligated to do so. If you do not wish to do so,
 *    delete this exception statement from your version. If you delete this
 *    exception statement from all source files in the program, then also delete
 *    it in the license file.
 */

import assert from 'assert';
import encoding from './encoding';
import Util, { toHexString } from './util';


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

  getUtxoId() {
    const dataBuf = Buffer.alloc(32);
    this.hash.copy(dataBuf, 0);
    dataBuf.writeInt32BE(0, 0);
    dataBuf.writeInt32BE(0, 4);
    dataBuf.writeInt32BE(0, 8);
    dataBuf.writeInt32BE(0, 12);
    dataBuf.writeUInt8(this.index, 16);
    return toHexString(dataBuf);
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
    return toHexString(this.toRaw());
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
