import ethUtil from 'ethereumjs-util';

const MAX_UINT32 = 0xFFFFFFFF;

export default class Block {
  constructor(parent, height) {
    this.parent = parent;
    this.height = height;
    this.txList = [];
  }

  addTx(tx) {
    if (this.txList.indexOf(tx.hash()) > -1) {
      throw Error('tx already contained');
    }
    this.txList.push(tx);
    return this;
  }

  hashTree(list) {
    if (list.length % 2 !== 0) {
      throw Error('uneven number of tx');
    }
    let payload;
    const rv = [];
    for (let i = 0; i < list.length; i += 2) {
      payload = Buffer.alloc(64);
      list[i].copy(payload, 0);
      list[i + 1].copy(payload, 32);
      rv.push(ethUtil.sha3(payload));
    }
    if (rv.length === 1) {
      return `0x${rv[0].toString('hex')}`;
    }
    return this.hashTree(rv);
  }

  merkleRoot() {
    const hashBufs = [];
    for (let i = 0; i < this.txList.length; i += 1) {
      hashBufs.push(this.txList[i].hashBuf());
    }
    if (hashBufs.length % 2 !== 0) {
      hashBufs.push(Buffer.alloc(32, 0));
    }
    return this.hashTree(hashBufs);
  }

  unsigedHeader(payload) {
    payload.write(this.parent.replace('0x', ''), 0, 'hex');
    const big = ~~(this.height / MAX_UINT32);  // eslint-disable-line no-bitwise
    payload.writeUInt32BE(big, 32);
    const low = (this.height % MAX_UINT32) - big;
    payload.writeUInt32BE(low, 36);
    payload.write(this.merkleRoot().replace('0x', ''), 40, 'hex');
    return payload;
  }

  sigHash() {
    return ethUtil.sha3(this.unsigedHeader(Buffer.alloc(72, 0)));
  }

  sign(privKey) {
    const privBuf = new Buffer(privKey.replace('0x', ''), 'hex');
    const sig = ethUtil.ecsign(this.sigHash(), privBuf);
    this.v = sig.v;
    this.r = sig.r;
    this.s = sig.s;
    return [sig.v, `0x${sig.r.toString('hex')}`, `0x${sig.s.toString('hex')}`];
  }

  hash() {
    if (!this.v || !this.r || !this.s) {
      throw new Error('not signed yet');
    }
    const payload = this.unsigedHeader(Buffer.alloc(137, 0));

    payload.writeUInt8(this.v, 72);
    this.r.copy(payload, 73);
    this.s.copy(payload, 105);
    return ethUtil.bufferToHex(ethUtil.sha3(payload));
  }

  //  _txData = [ 32b blockHash, 32b r, 32b s, (4b offset, 8b pos, 1b v, ..00.., 1b txData),
  // 32b txData, 32b proof, 32b proof ]
  proof(txData, pos, proof) {
    const slices = [];
    slices.push(this.hash());
    slices.push(`0x${this.r.toString('hex')}`);
    slices.push(`0x${this.s.toString('hex')}`);

    let sliceCount = Math.floor(txData.length / 32) + 1;

    let payload = Buffer.alloc(32);
    payload.writeUInt32BE(txData.length, 0);
    payload.writeUInt8((((txData.length % 32) > 19) ? sliceCount+1 : sliceCount) + 3, 1);
    const big = ~~(pos / MAX_UINT32);  // eslint-disable-line no-bitwise
    payload.writeUInt32BE(big, 4);
    const low = (pos % MAX_UINT32) - big;  // eslint-disable-line no-bitwise
    payload.writeUInt32BE(low, 8);
    payload.writeUInt8(this.v, 13);
    if ((txData.length % 32) <= 19) {
      txData.copy(payload, 32 - (txData.length % 32), 0, txData.length % 32);
      slices.push(ethUtil.bufferToHex(payload));
    } else {
      slices.push(ethUtil.bufferToHex(payload));
      payload = Buffer.alloc(32);
      txData.copy(payload, 32 - (txData.length % 32), 0, txData.length % 32);
      slices.push(ethUtil.bufferToHex(payload));
    }

    for (let i = 1; i < sliceCount; i += 1) {
      slices.push(ethUtil.bufferToHex(txData.slice((txData.length % 32) + ((i - 1) * 32),
        (txData.length % 32) + (i * 32))));  // eslint-disable-line no-bitwise
    }
    for (let i = 0; i < proof.length; i += 1) {
      slices.push(proof[i]);
    }
    return slices;
  }

}
