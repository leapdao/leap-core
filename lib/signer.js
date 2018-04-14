import ethUtil from 'ethereumjs-util';

const EMPTY = Buffer.alloc(32, 0);
const IN_LENGTH = 33 + 65;
const OUT_LENGTH = 28;

export default class Signer {
  constructor(values, txData, type) {
    this.values = values;
    this.txData = txData;
    this.type = type;
  }

  sign(privKeys) {
    if (privKeys.length != this.values[0].length) {
      throw Error('amount of private keys doesn\'t mathch amount of inputs');
    }
    for (let i = 0; i < privKeys.length; i++) {
      const privBuf = new Buffer(privKeys[i].replace('0x', ''), 'hex');
      const hash = ethUtil.sha3(this.sigHashBuf());
      const sig = ethUtil.ecsign(hash, privBuf);
      sig.r.copy(this.txData, 43 + (i * IN_LENGTH));
      sig.s.copy(this.txData, 75 + (i * IN_LENGTH));
      this.txData.writeInt8(sig.v, 107 + (i * IN_LENGTH));
    }
    return this;
  }

  hash() {
    if (this.txData.slice(34, 66).equals(EMPTY)) {
      throw Error('not signed yet');
    }
    const hash = ethUtil.sha3(this.txData);
    return `0x${hash.toString('hex')}`;
  }

  sigHashBuf() {
    const noSigs = Buffer.alloc(this.txData.length, 0);
    this.txData.copy(noSigs, 0, 0, 10);
    let start;
    for (let i = 0; i < this.values[0].length; i++) {
      start = 10 + (i * IN_LENGTH);
      this.txData.copy(noSigs, start, start, 33);
    }
    start = 10 + (this.values[0].length * IN_LENGTH);
    this.txData.copy(noSigs, start, start, this.txData.length - start);
    return ethUtil.sha3(noSigs);
  }

  sigHash() {
    return `0x${this.sigHashBuf().toString('hex')}`;
  }

  hex() {
    return `0x${this.txData.toString('hex')}`;
  }
}
