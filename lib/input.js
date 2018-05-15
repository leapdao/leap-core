import assert from 'assert';
import ethUtils from 'ethereumjs-util';
import encoding from './encoding';
import Outpoint from './outpoint';
import Util from './util';


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
   * Calculate size of outpoint.
   * @returns {Number}
   */

  getSize() {
    if (this.isDeposit()) {
      return 4;
    }
    if (this.isSpend()) {
      return 98;
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
    this.signer = signer;
  }

  toJSON() {
    if (this.isDeposit()) {
      return {
        depositId: this.depositId,
      };
    }
    if (this.isSpend()) {
      const input = this.prevout;
      if (this.signer) {
        input.r = `0x${this.r.toString('hex')}`;
        input.s = `0x${this.s.toString('hex')}`;
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
   * @returns {Outpoint}
   */
  static fromJSON(json) {
    assert(json, 'Input data is required.');
    if (json.depositId) {
      return new Input(json.depositId);
    }
    if (json.hash) {
      const input = new Input(Outpoint.fromJSON(json));
      if (json.signer) {
        input.setSig(json.r, json.s, json.v, json.signer);
      }
    }
  }

  /**
   * Instantiate input from serialized data.
   * @param {Buffer} data
   * @returns {Outpoint}
   */
  static fromRaw(buf, offset, sigHash) {
    const off = (offset) ? offset : 0;
    const prevout = new Outpoint(buf.slice(0 + off, 32 + off), buf.readUInt8(32 + off));
    const input = new Input(prevout);
    const r = buf.slice(33 + off, 65 + off);
    if (sigHash) {
      const s = buf.slice(65 + off, 97 + off);
      const v = buf.readUInt8(97 + off);
      const pubKey = ethUtils.ecrecover(sigHash, v, r, s);
      const addrBuf = ethUtils.pubToAddress(pubKey);
      const signer = ethUtils.bufferToHex(addrBuf);
      input.setSig(r, s, v, signer);
    }
    return input;
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

}
