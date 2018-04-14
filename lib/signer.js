import ethUtil from 'ethereumjs-util';

export default class Signer {
  constructor(values, txData, type) {
    this.values = values;
    this.txData = txData;
    this.type = type;
  }

  sign(privKey) {
    const privBuf = new Buffer(privKey.replace('0x', ''), 'hex');
    const unsignedLength = 10 + (this.values[0].length * 33) + (this.values[1].length * 28);
    if (this.txData.length > unsignedLength) {
      // nothing todo, signed already
      return this;
    }
    const withoutSigs = this.txData.slice(0, unsignedLength);
    const hash = ethUtil.sha3(withoutSigs);
    const sig = ethUtil.ecsign(hash, privBuf);
    const newData = Buffer.alloc(unsignedLength + 65, 0);
    this.txData.copy(newData, 0);
    sig.r.copy(newData, newData.length - 65);
    sig.s.copy(newData, newData.length - 33);
    newData.writeInt8(sig.v, newData.length - 1);
    this.txData = newData;
    return this;
  }

  hash() {
    const unsignedLength = 10 + (this.values[0].length * 33) + (this.values[1].length * 28)
    if (this.txData.length === unsignedLength) {
      throw Error('not signed yet');
    }
    const hash = ethUtil.sha3(this.txData);
    return `0x${hash.toString('hex')}`;
  }

  sigHash() {
    const withoutSigs = this.txData.slice(0, 10 + (this.values[0].length * 33) + (this.values[1].length * 28));
    const hash = ethUtil.sha3(withoutSigs);
    return `0x${hash.toString('hex')}`;
  }

  hex() {
    return `0x${this.txData.toString('hex')}`;
  }
}
