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
 
import { bufferToHex } from 'ethereumjs-util';
import MerkleTree from './merkleTree';

export default class Period {
  constructor(prevHash, blocks) {
    this.prevHash = prevHash;
    this.blockList = [];
    this.blockHashList = [];
    if (blocks) {
      blocks.forEach(block => this.addBlock(block));
    }
  }

  addBlock(block) {
    if (this.blockHashList.indexOf(block.hash()) > -1) {
      throw Error('block already contained');
    }
    this.blockList.push(block);
    this.blockHashList.push(block.hash());
    // invalidate existing tree
    // todo: optimize not to recalculate the whole tree on every tx added
    this.merkleTree = null;
    return this;
  }

  getMerkleTree() {
    if (this.blockList.length === 0) {
      throw Error('no blocks contained');
    }
    if (!this.merkleTree) {
      const hashBufs = this.blockList.map(block => block.getMerkleTree().getRoot());
      this.merkleTree = new MerkleTree(hashBufs);
    }
    return this.merkleTree;
  }

  merkleRoot() {
    return this.getMerkleTree().getHexRoot();
  }

  proof(tx) {
    let blockPos;
    let periodPos = -1;
    for (let i = 0; i < this.blockList.length; i++) {
      const pos = this.blockList[i].txHashList.indexOf(tx.hash());
      if (pos >= 0) {
        if (periodPos >= 0) {
          throw Error('tx doublespend');
        }
        blockPos = pos;
        periodPos = i;
      }
    }
    if (blockPos < 0) {
      throw Error('tx not in this period');
    }
    // get block proof in period
    const blockProof = this.getMerkleTree()
      .getProof(this.blockList[periodPos].getMerkleTree().getRoot())
      .map(buff => bufferToHex(buff));

    // get tx proof in block
    const proof = this.blockList[periodPos].proof(tx, periodPos);

    // merge and return
    blockProof.forEach(elem => proof.push(elem));

    // replace root
    proof[0] = this.merkleRoot();
    return proof;
  }

}
