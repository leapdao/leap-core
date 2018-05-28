import ethUtil, { bufferToHex, toBuffer } from 'ethereumjs-util';
import MerkleTree from './merkleTree';
import { writeUint64 } from './util';

export default class Block {
  constructor(parent, height) {
    this.parent = parent;
    this.height = height;
    this.txList = [];
    this.txHashList = [];
  }

  addTx(tx) {
    if (this.txHashList.indexOf(tx.hash()) > -1) {
      throw Error('tx already contained');
    }
    this.txList.push(tx);
    this.txHashList.push(tx.hash());
    // invalidate existing tree
    // todo: optimize not to recalculate the whole tree on every tx added
    this.merkleTree = null;
    return this;
  }

  getMerkleTree() {
    if (!this.merkleTree) {
      const hashBufs = this.txList.map(tx => tx.toRaw());
      this.merkleTree = new MerkleTree(hashBufs);
    }
    return this.merkleTree;
  }

  merkleRoot() {
    return this.getMerkleTree().getHexRoot();
  }

  unsignedHeader(payload) {
    payload.write(this.parent.replace('0x', ''), 0, 'hex');
    writeUint64(payload, this.height, 32);
    payload.write(this.merkleRoot().replace('0x', ''), 40, 'hex');
    return payload;
  }

  sigHash() {
    return ethUtil.sha3(this.unsignedHeader(Buffer.alloc(72, 0)));
  }

  sign(privKey) {
    const privBuf = toBuffer(privKey);
    const sig = ethUtil.ecsign(this.sigHash(), privBuf);
    this.v = sig.v;
    this.r = sig.r;
    this.s = sig.s;
    return [sig.v, bufferToHex(sig.r), bufferToHex(sig.s)];
  }

  hash() {
    if (!this.v || !this.r || !this.s) {
      throw new Error('not signed yet');
    }
    const payload = this.unsignedHeader(Buffer.alloc(137, 0));

    payload.writeUInt8(this.v, 72);
    this.r.copy(payload, 73);
    this.s.copy(payload, 105);
    return ethUtil.bufferToHex(ethUtil.sha3(payload));
  }

  // Returns proof of block inclusion for given tx
  // [
  // 32b - blockHash
  // 32b - r-part of the signature
  // 32b - s-part of the signature,
  // 32b - (
  //    1b tx data byte offset,
  //    1b merkle proof 32b-slice offset,
  //    2b tx length,
  //    8b tx position index in the block,
  //    1b v,
  //     ..00..,
  //      Xb txData - up to 19 bytes of the first X bytes of tx data where X = txLength % 32
  //    ),
  // 32b - txData,
  // ... <more 32b tx data if needed>
  // 32b - proof,
  // ... <more 32b proofs if needed>
  // ]
  proof(tx) {
    const txData = tx.toRaw();
    const pos = this.txHashList.indexOf(tx.hash());
    if (pos < 0) {
      throw Error('tx not in the block');
    }
    const slices = [];
    slices.push(this.hash());
    slices.push(bufferToHex(this.r));
    slices.push(bufferToHex(this.s));

    // Slices with tx metadata, v-sig and tx data
    // metadata size is 13 bytes (see proof structure above)
    const metadataAndTxLength = 13 + txData.length;
    // align to 32 bytes, so that e.g. 38 bytes will be stored in 64 bytes buffer
    const doubleWordAlignedLength = metadataAndTxLength + (32 - (metadataAndTxLength % 32));
    const txPayload = Buffer.alloc(doubleWordAlignedLength);
    // tx length
    txPayload.writeUInt32BE(txData.length, 0);
    // byte offset of the tx data in proof bytes
    let offset = 32 * 3 + (txPayload.length - txData.length);
    txPayload.writeUInt8(offset, 0);
    // offset of the merkle proof in array of 32byte slices
    const sliceCount = Math.floor(txData.length / 32) + 1;
    txPayload.writeUInt8((((txData.length % 32) > 19) ? sliceCount + 1 : sliceCount) + 3, 1);
    // tx index in the block
    writeUint64(txPayload, pos, 4);
    // v-part of the signature
    txPayload.writeUInt8(this.v, 13);
    // copy tx data tighly aligned to the right boundary of the buffer
    txData.copy(txPayload, txPayload.length - txData.length, 0);

    // split txdata buffer in 32 byte words as hex strings
    for (let i = 0; i < doubleWordAlignedLength / 32; i++) {
      slices.push(
        bufferToHex(txPayload.slice(i * 32, (i * 32) + 32)),
      );
    }

    // get merkle proofs
    const proofs = this.getMerkleTree()
      .getProof(tx.hashBuf())
      .map(buff => bufferToHex(buff));

    // Add slices with proofs and return
    return slices.concat(proofs);
  }

}
