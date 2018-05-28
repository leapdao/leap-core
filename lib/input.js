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
      return input;
    }
    return null;
  }

  toRaw() {
    const dataBuf = Buffer.alloc(this.getSize());
    if (this.isDeposit()) {
      dataBuf.writeUInt32BE(this.depositId);
    }
    if (this.isSpend()) {
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
    const input = new Input(prevout);
    const r = buf.slice(33 + off, 65 + off);
    const s = buf.slice(65 + off, 97 + off);
    const v = buf.readUInt8(97 + off);
    const signer = sigHashBuf ? Input.recoverSignerAddress(sigHashBuf, v, r, s) : '';
    input.setSig(r, s, v, signer);
    return input;
  }


  // Utils

  static recoverSignerAddress(sigHashBuf, v, r, s) {
    const pubKey = ethUtils.ecrecover(sigHashBuf, v, r, s);
    const addrBuf = ethUtils.pubToAddress(pubKey);
    return ethUtils.bufferToHex(addrBuf);
  }

}
