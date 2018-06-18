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
import ethUtils from 'ethereumjs-util';
import Outpoint from './outpoint';
import Util from './util';

// outpoint(32 bytes prev tx + 1 byte output pos) + 65 bytes signature
export const SPEND_INPUT_LENGTH = 33 + 65;

export default class Input {
  constructor(options) {
    if (Outpoint.isOutpoint(options)) {
      this.prevout = options;
    } else if (Util.isU32(options)) {
      this.depositId = options;
    } else if (options && options.contractAddr) {
      this.contractAddr = options.contractAddr;
      this.prevout = options.prevout;
    } else {
      assert(!options, 'Coinbase input should have no data.');
      this.coinbase = true;
    }
  }

  setSigner(signer) {
    this.signer = signer;
  }

  isCoinbase() {
    return (this.coinbase);
  }

  isComputation() {
    return (this.contractAddr);
  }

  isDeposit() {
    return (this.depositId);
  }

  isSpend() {
    return (this.prevout);
  }

  /**
   * Calculate size of input.
   * @returns {Number}
   */

  getSize() {
    if (this.isDeposit()) {
      return 4;
    }
    if (this.isComputation()) {
      return 33;
    }
    if (this.isSpend()) {
      return SPEND_INPUT_LENGTH;
    }
    return 0;
  }

  setSig(r, s, v, signer) {
    assert(this.isSpend(), 'Can only set signature on outpoint');
    assert(Buffer.isBuffer(r), 'r has to be buffer');
    assert(r.length === 32, 'r length must be 32 bytes.');
    this.r = r;
    assert(Buffer.isBuffer(s), 's has to be buffer');
    assert(s.length === 32, 's length must be 32 bytes.');
    this.s = s;
    assert(Util.isU8(v), 'v must be a uint8.');
    this.v = v;
    if (signer) {
      assert(typeof signer === 'string', 'signer must be a string');
      this.signer = signer;
    }
  }

  recoverSigner(sigHashBuf) {
    assert(this.v, 'Input should be signed');
    assert(sigHashBuf, 'sigHashBuf is required');
    this.signer = Input.recoverSignerAddress(sigHashBuf, this.v, this.r, this.s);
  }

  toJSON() {
    if (this.isDeposit()) {
      return {
        depositId: this.depositId,
      };
    }
    if (this.isComputation()) {
      const input = { ...this.prevout }; // toJSON shouldn't mutate existing objects
      input.hash = ethUtils.bufferToHex(input.hash);
      return input;
    }
    if (this.isSpend()) {
      const input = { ...this.prevout }; // toJSON shouldn't mutate existing objects
      input.hash = ethUtils.bufferToHex(input.hash);
      if (this.signer) {
        input.r = ethUtils.bufferToHex(this.r);
        input.s = ethUtils.bufferToHex(this.s);
        input.v = this.v;
        input.signer = this.signer;
      }
      return input;
    }
    return {};
  }

  /**
   * Instantiate input from json object.
   * @param {Object} json
   * @returns {Input}
   */
  static fromJSON(json) {
    assert(json, 'Input data is required.');
    if (json.depositId) {
      return new Input(json.depositId);
    }
    if (json.hash) {
      const input = new Input(Outpoint.fromJSON(json));
      if (json.signer) {
        input.setSig(
          ethUtils.toBuffer(json.r),
          ethUtils.toBuffer(json.s),
          json.v,
          json.signer,
        );
      }
      if (json.contractAddr) {
        input.contractAddr = json.contractAddr;
      }
      return input;
    }
    return null;
  }

  toRaw() {
    const dataBuf = Buffer.alloc(this.getSize());
    if (this.isDeposit()) {
      dataBuf.writeUInt32BE(this.depositId);
    } else if (this.isComputation()) {
      this.prevout.toRaw(dataBuf, 0);
    } else if (this.isSpend()) {
      this.prevout.toRaw(dataBuf, 0);
      if (this.signer) {
        this.r.copy(dataBuf, 33);
        this.s.copy(dataBuf, 65);
        dataBuf.writeInt8(this.v, 97);
      }
    }
    return dataBuf;
  }

  /**
   * Instantiate input from serialized data.
   * @param {Buffer} data
   * @returns {Input}
   */
  static fromRaw(buf, offset, sigHashBuf) {
    const off = (offset) || 0;
    const prevout = new Outpoint(buf.slice(0 + off, 32 + off), buf.readUInt8(32 + off));
    let input;
    if (sigHashBuf) {
      input = new Input(prevout);
      const r = buf.slice(33 + off, 65 + off);
      const s = buf.slice(65 + off, 97 + off);
      const v = buf.readUInt8(97 + off);
      const signer = Input.recoverSignerAddress(sigHashBuf, v, r, s);
      input.setSig(r, s, v, signer);
    } else {
      input = new Input({ prevout, contractAddr: '0x00' });
    }
    return input;
  }


  // Utils

  static recoverSignerAddress(sigHashBuf, v, r, s) {
    const pubKey = ethUtils.ecrecover(sigHashBuf, v, r, s);
    const addrBuf = ethUtils.pubToAddress(pubKey);
    return ethUtils.bufferToHex(addrBuf);
  }

}
