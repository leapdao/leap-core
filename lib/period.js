
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import { bufferToHex, toBuffer, keccak256 } from 'ethereumjs-util';
import MerkleTree from './merkleTree';
import Block from './block';
import { range } from './util';
import { periodBlockRange } from './helpers';

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
      const hashBufs = this.blockList.map((block) => {
        if (block.txList.length === 0) {
          return Buffer.alloc(32, 0);
        }
        return block.getMerkleTree().getRoot();
      });
      this.merkleTree = new MerkleTree(hashBufs);
    }
    return this.merkleTree;
  }

  merkleRoot() {
    return this.getMerkleTree().getHexRoot();
  }

  setValidatorData(slotId, ownerAddr) {
    this.slotId = slotId;
    this.ownerAddr = toBuffer(ownerAddr);
  }

  periodData() {
    if (typeof this.slotId === 'undefined' || !this.ownerAddr) {
      throw Error('period is missing validator data to create period root.');
    }
    // make casRoot
    let rootBuf = Buffer.alloc(64, 0);
    rootBuf.writeUInt8(this.slotId, 11);
    this.ownerAddr.copy(rootBuf, 12);
    const validatorRoot = keccak256(rootBuf);
    rootBuf = Buffer.alloc(64, 0);
    validatorRoot.copy(rootBuf, 32);
    const casRoot = keccak256(rootBuf);

    // make consensusRoot
    const blocksRoot = this.getMerkleTree().getRoot();
    rootBuf = Buffer.alloc(64, 0);
    blocksRoot.copy(rootBuf);
    const consensusRoot = keccak256(rootBuf);

    // make period root
    rootBuf = Buffer.alloc(64, 0);
    consensusRoot.copy(rootBuf);
    casRoot.copy(rootBuf, 32);
    const periodRoot = bufferToHex(keccak256(rootBuf));
    return {
      casRoot,
      periodRoot,
    };
  }

  periodRoot() {
    const { periodRoot } = this.periodData();
    return periodRoot;
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

    // merge blocks proof into tx proof
    blockProof.forEach(elem => proof.push(elem));

    // add extensible proof structure
    const { casRoot, periodRoot } = this.periodData();

    // update the proof
    proof.push(bufferToHex(Buffer.alloc(32, 0)));
    proof.push(bufferToHex(casRoot));
    proof[0] = periodRoot;
    return proof;
  }


 /**
 * Creates new Period with all the blocks from the given interval.
 *
 * @param {ExtendedWeb3} plasma instance of Leap Web3
 * @param {Number} startBlock first block to include in the period
 * @param {Number} endBlock last block to include in the period
 * @returns {Period} period
 */
  static periodForBlockRange(plasma, startBlock, endBlock) {
    return Promise.all(
      range(startBlock, endBlock).map(n => plasma.eth.getBlock(n, true)),
    ).then((blocks) => {
      const blockList = blocks
        .filter(a => !!a)
        .map(({ number, timestamp, transactions }) =>
          Block.from(number, timestamp, transactions),
        );
      return new Period(null, blockList);
    });
  }

 /**
 * Creates {Period} where given tx was included.
 *
 * @param {ExtendedWeb3} plasma instance of Leap Web3
 * @param {Transaction} tx transaction to create {Period} for
 * @returns {Period} period
 */
  static periodForTx(plasma, tx) {
    const { blockNumber } = tx;
    const [startBlock, endBlock] = periodBlockRange(blockNumber);
    return Period.periodForBlockRange(plasma, startBlock, endBlock);
  }

}
