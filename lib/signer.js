import ethUtil from 'ethereumjs-util';

const EMPTY = Buffer.alloc(32, 0);
const IN_LENGTH = 33 + 65;

export default class Signer {
  constructor(values, txData, type, height) {
    this.values = values;
    this.txData = txData;
    this.type = type;
    this.height = height;
  }

  sign(privKeys) {
    if (privKeys.length !== this.values[0].length) {
      throw Error('amount of private keys doesn\'t mathch amount of inputs');
    }
    for (let i = 0; i < privKeys.length; i += 1) {
      const privBuf = new Buffer(privKeys[i].replace('0x', ''), 'hex');
      const sig = ethUtil.ecsign(this.sigHashBuf(), privBuf);
      sig.r.copy(this.txData, 43 + (i * IN_LENGTH));
      sig.s.copy(this.txData, 75 + (i * IN_LENGTH));
      this.txData.writeInt8(sig.v, 107 + (i * IN_LENGTH));
    }
    return this;
  }

  hashBuf() {
    if (this.txData.slice(34, 66).equals(EMPTY)) {
      throw Error('not signed yet');
    }
    return ethUtil.sha3(this.txData);
  }

  hash() {
    return `0x${this.hashBuf().toString('hex')}`;
  }

  sigHashBuf() {
    const noSigs = Buffer.alloc(this.txData.length, 0);
    this.txData.copy(noSigs, 0, 0, 10);
    let start;
    for (let i = 0; i < this.values[0].length; i += 1) {
      start = 10 + (i * IN_LENGTH);
      this.txData.copy(noSigs, start, start, start + 33);
    }
    start = 10 + (this.values[0].length * IN_LENGTH);
    this.txData.copy(noSigs, start, start, this.txData.length);
    return ethUtil.sha3(noSigs);
  }

  toJSON() {
    let rv = {
      hash: this.hash(),
      type: this.type,
    };
    if (this.type == 1) {
      rv.outs = [{
        value: this.values[0],
        addr: this.values[1],
      }];
    }
    if (this.type == 2) {
      rv.ins = [{
        depositId: this.values[0],
      }];
      
      rv.outs = [{
        value: this.values[1],
        addr: this.values[2],
      }];
    }
    if (this.type > 2) {
      rv.ins = this.values[0];
      // update txData
      for (let i = 0; i < this.values[0].length; i += 1) {
        new Buffer(this.values[0][i].r.replace('0x',''), 'hex').copy(this.txData, 43 + (i * IN_LENGTH));
        new Buffer(this.values[0][i].s.replace('0x',''), 'hex').copy(this.txData, 75 + (i * IN_LENGTH));
        this.txData.writeInt8(this.values[0][i].v, 107 + (i * IN_LENGTH));
      }
      rv.hash = this.hash();
      rv.outs = this.values[1];
      rv.height = this.height;
    }
    return rv;
  }

  sigHash() {
    return `0x${this.sigHashBuf().toString('hex')}`;
  }

  hex() {
    return `0x${this.txData.toString('hex')}`;
  }

  buf() {
    return this.txData;
  }
}
