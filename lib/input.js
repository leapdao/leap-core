
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import assert from 'assert';
import ethUtils from 'ethereumjs-util';
import Outpoint from './outpoint';
import Util from './util';
import Type from './type';

// outpoint(32 bytes prev tx + 1 byte output pos) + 65 bytes signature
export const SPEND_INPUT_LENGTH = 33 + 65;

export default class Input {
  constructor(options) {
    if (Outpoint.isOutpoint(options)) {
      this.prevout = options;
    } else if (Util.isU32(options)) {
      this.depositId = options;
    } else if (options && options.script) {
      this.type = Type.SPEND_COND;
      this.script = options.script;
      if (!Buffer.isBuffer(options.script)) {
        this.script = ethUtils.toBuffer(options.script);
      }
      if (options.gasPrice) {
        throw new Error('gasPrice deprecated');
      }

      this.prevout = options.prevout;
      if (options.msgData) {
        this.msgData = options.msgData;
        if (!Buffer.isBuffer(options.msgData)) {
          this.msgData = ethUtils.toBuffer(options.msgData);
        }
      }
    } else if (options && options.prevout) {
      this.type = options.type;
      this.prevout = options.prevout;
    }
  }

  setSigner(signer) {
    this.signer = signer;
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
    if (this.type === Type.SPEND_COND) {
      // prevout + 2 bytes msgData length + msgData
      // + 2 bytes script length + script
      let rv = 33 + 2 + 2 + this.script.length;
      rv += (this.msgData) ? this.msgData.length : 0;
      return rv;
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

  setMsgData(msgData) {
    assert(this.type === Type.SPEND_COND, 'Can only set msgData on SPEND_COND');
    this.msgData = msgData;
    if (!Buffer.isBuffer(msgData)) {
      this.msgData = ethUtils.toBuffer(msgData);
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
    if (this.type === Type.SPEND_COND) {
      const input = { ...this.prevout };
      input.hash = ethUtils.bufferToHex(input.hash);
      input.msgData = ethUtils.bufferToHex(this.msgData);
      input.script = ethUtils.bufferToHex(this.script);
      if (this.type) {
        input.type = this.type;
      }
      return input;
    }
    if (this.isSpend()) {
      const input = { ...this.prevout };
      input.hash = ethUtils.bufferToHex(input.hash);
      if (this.type) {
        input.type = this.type;
      }
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
      if (json.type) {
        input.type = json.type;
      }
      // spending condition
      if (json.script) {
        input.gasPrice = json.gasPrice;
        input.msgData = ethUtils.toBuffer(json.msgData);
        input.script = ethUtils.toBuffer(json.script);
      }
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
    } else if (this.type === Type.SPEND_COND) {
      this.prevout.toRaw(dataBuf, 0);
      const msgDataLength = (this.msgData) ? this.msgData.length : 0;
      if (msgDataLength) {
        dataBuf.writeUInt16BE(this.msgData.length, 33);
        this.msgData.copy(dataBuf, 35);
      }
      dataBuf.writeUInt16BE(this.script.length, 35 + msgDataLength);
      this.script.copy(dataBuf, 37 + msgDataLength);
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
    if (sigHashBuf === Type.SPEND_COND) {
      const msgLength = buf.readUInt16BE(off + 33);
      const msgData = Buffer.alloc(msgLength);
      buf.copy(msgData, 0, off + 35, off + 35 + msgLength);

      const scriptLength = buf.readUInt16BE(off + 35 + msgLength);
      const script = Buffer.alloc(scriptLength);
      buf.copy(script, 0, off + 37 + msgLength, off + 37 + msgLength + scriptLength);
      input = new Input({ prevout, msgData, script, type: sigHashBuf });
    } else if (sigHashBuf) {
      input = new Input(prevout);
      const r = buf.slice(33 + off, 65 + off);
      const s = buf.slice(65 + off, 97 + off);
      const v = buf.readUInt8(97 + off);
      const signer = Input.recoverSignerAddress(sigHashBuf, v, r, s);
      input.setSig(r, s, v, signer);
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
