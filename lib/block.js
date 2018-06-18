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

import ethUtil, { bufferToHex } from 'ethereumjs-util';
import assert from 'assert';
import MerkleTree from './merkleTree';
import { writeUint64, readUint64 } from './util';
import Tx from './transaction';

export default class Block {
  constructor(height, txs = []) {
    this.height = height;
    this.txList = txs;
    this.txHashList = txs.map(tx => tx.hash());
    this.merkleTree = null;
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
      const hashBufs = this.txList.map(tx => tx.hashBuf());
      this.merkleTree = new MerkleTree(hashBufs);
    }
    return this.merkleTree;
  }

  merkleRoot() {
    return this.getMerkleTree().getHexRoot().toString();
  }

  header(payload) {
    writeUint64(payload, this.height, 0);
    payload.write(this.merkleRoot().replace('0x', ''), 8, 'hex');
    return payload;
  }

  hash() {
    const payload = this.header(Buffer.alloc(40, 0));
    return ethUtil.bufferToHex(ethUtil.sha3(payload));
  }

  // Returns serialized tx bytes as hex string
  hex() {
    return toHexString(this.toRaw());
  }

  equals(another) {
    return deepEqual(this, another);
  }

  /*
  * Returns raw block data size
  */
  getSize() {
    // 8 bytes height + for each tx( X bytes raw tx size + 4 bytes raw tx length )
    return 8 + this.txList.reduce((s, tx) => s += tx.getSize() + 4, 0);
  }

  toJSON() {
    return {
      height: this.height,
      txs: this.txList.map(tx => tx.toJSON())
    };
  }

  static fromJSON({ height, txs }) {
    return new Block(height, txs.map(Tx.fromJSON));
  }

  /*
  * Returns {Buffer} with raw serialized block bytes
  *
  * 8 bytes - height
  * [
  *  4 bytes - tx 1 length,
  *  X bytes - tx 1 data,
  *  4 bytes - tx 2 length,
  *  X bytes - tx 2 data,
  *  ...
  * ]
  *
  * Also: `fromRaw`
  */
  toRaw() {
    const payload = Buffer.alloc(this.getSize(), 0);
    writeUint64(payload, this.height, 0);
    let offset = 8, rawTx;
    this.txList.forEach(tx => {
      rawTx = tx.toRaw();
      assert(rawTx.length <= 2 ** 32);
      payload.writeUInt32BE(rawTx.length, offset);
      rawTx.copy(payload, offset + 4);
      offset += rawTx.length + 4;
    });
    return payload;
  }

  /*
  * Creates block from raw serialized bytes
  * Also: `toRaw`
  */
  static fromRaw(buf) {
    const height = readUint64(buf);
    const block = new Block(height);
    let offset = 8, txSize;
    while (offset < buf.length) {
      txSize = buf.readUInt32BE(offset);
      block.addTx(Tx.fromRaw(buf.slice(offset + 4, offset + 4 + txSize)));
      offset += txSize + 4;
    }
    return block;
  }

  // Returns proof of block inclusion for given tx
  // [
  // 32b - blockHash
  // 32b - (
  //    1b tx data byte offset,
  //    1b merkle proof 32b-slice offset,
  //    2b tx length,
  //    8b tx position index in the block,
  //     ..00..,
  //    Xb txData - up to 20 bytes of the first X bytes of tx data where X = txLength % 32
  //  ),
  // 32b - txData,
  // ... <more 32b tx data if needed>
  // 32b - proof,
  // ... <more 32b proofs if needed>
  // ]
  proof(tx, proofOffset = 0) {
    const txData = tx.toRaw();
    let pos = this.txHashList.indexOf(tx.hash());
    if (pos < 0) {
      throw Error('tx not in the block');
    }
    if (proofOffset > 0) {
      // 1. find size of block (rounded pow 2)
      let nextPow = this.txList.length - 1;
      nextPow |= nextPow >> 1; // eslint-disable-line no-bitwise
      nextPow |= nextPow >> 2; // eslint-disable-line no-bitwise
      nextPow |= nextPow >> 4; // eslint-disable-line no-bitwise
      nextPow |= nextPow >> 8; // eslint-disable-line no-bitwise
      nextPow |= nextPow >> 16; // eslint-disable-line no-bitwise
      nextPow++;
      // 2. shift proofOffset
      // 3. add numbers
      pos += (proofOffset << Math.log2(nextPow)); // eslint-disable-line no-bitwise
    }
    const slices = [];
    slices.push(this.hash());

    // Slices with tx metadata, v-sig and tx data
    // metadata size is 13 bytes (see proof structure above)
    const metadataAndTxLength = 13 + txData.length;
    // align to 32 bytes, so that e.g. 38 bytes will be stored in 64 bytes buffer
    const doubleWordAlignedLength = metadataAndTxLength + (32 - (metadataAndTxLength % 32));
    const txPayload = Buffer.alloc(doubleWordAlignedLength);
    // tx length
    txPayload.writeUInt32BE(txData.length, 0);
    // byte offset of the tx data in proof bytes
    const offset = 32 + (txPayload.length - txData.length);
    txPayload.writeUInt8(offset, 0);
    // offset of the merkle proof in array of 32byte slices
    const sliceCount = Math.floor(txData.length / 32) + 1;
    txPayload.writeUInt8((((txData.length % 32) > 20) ? sliceCount + 1 : sliceCount) + 1, 1);
    // tx index in the block
    writeUint64(txPayload, pos, 4);
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
