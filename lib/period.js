
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
import Util from './util';

import { BLOCKS_PER_PERIOD } from './constants';

export default class Period {

  /**
   * 
   * Create a Period object linked to the previous Period via `prevHash` and
   * containing given list of `blocks`.
   * 
   * Optional parameters can be given via `opts` argument. Format as follows:
   * 
   * type PeriodOptions = {
   *   validatorData?: {
   *     slotId: number;
   *     ownerAddr: string | Buffer | number;
   *     casBitmap?: string | Buffer | number; 
   *   };
   *   excludePrevHashFromProof?: Boolean;
   * };
   * 
   * @param {string} prevHash - previous period root hash
   * @param {Array<Block>} blocks - array of blocks to include in the period
   * @param {PeriodOptions} opts - options defined as above. Default {}
   */
  constructor(prevHash, blocks, opts = {}) {
    this.prevHash = prevHash;
    this.blockList = [];
    this.blockHashList = [];
    this.usePrev = !opts.excludePrevHashFromProof;
    if (blocks) {
      blocks.forEach(block => this.addBlock(block));
    }

    const { slotId, ownerAddr, casBitmap } = opts.validatorData || {};
    if ((slotId || slotId === 0) && ownerAddr) {
      this.setValidatorData(slotId, ownerAddr, casBitmap);
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

  setValidatorData(slotId, ownerAddr, casBitmap) {
    this.slotId = slotId;
    this.ownerAddr = toBuffer(ownerAddr);
    if (casBitmap) {
      this.casBitmap = toBuffer(casBitmap);
    }
  }

  // 
  /**
   * helpful: https://docs.google.com/drawings/d/13oFjua-v_E_yaFYUbralluI-EysgtTaZb_sSgGbxG_A
   * 
   *                          period root
   *                        /             \
   *          consensus root               CAS root  
   *         /             \             /          \
   *   blocks root      meta root     CAS bitmap    validator root
   *                   /        \                         /      \
   *          fees hash    prevPeriodHash         * slotId        0x0
   *                                              * ownerAddr
   */
  periodData() {
    if (typeof this.slotId === 'undefined' || !this.ownerAddr) {
      throw Error('period is missing validator data to create period root.');
    }
    // make validator Root
    let rootBuf = Buffer.alloc(64, 0);
    rootBuf.writeUInt8(this.slotId, 11);
    this.ownerAddr.copy(rootBuf, 12);
    const validatorRoot = keccak256(rootBuf);

    // make casRoot
    rootBuf = Buffer.alloc(64, 0);
    if (this.casBitmap) {
      this.casBitmap.copy(rootBuf, 0);
    }
    validatorRoot.copy(rootBuf, 32);
    const casRoot = keccak256(rootBuf);
      
    // make metaRoot
    let metaRoot = Buffer.alloc(32, 0);
    if (this.usePrev) {
      rootBuf = Buffer.alloc(64, 0);
      toBuffer(this.prevHash).copy(rootBuf, 32);
      metaRoot = keccak256(rootBuf);
    }
         
    // make consensusRoot
    const blocksRoot = this.getMerkleTree().getRoot();
    rootBuf = Buffer.alloc(64, 0);
    blocksRoot.copy(rootBuf);
    metaRoot.copy(rootBuf, 32);
    const consensusRoot = keccak256(rootBuf);

    // make period root
    rootBuf = Buffer.alloc(64, 0);
    consensusRoot.copy(rootBuf);
    casRoot.copy(rootBuf, 32);
    const periodRoot = bufferToHex(keccak256(rootBuf));
    return {
      casRoot,
      periodRoot,
      metaRoot
    };
  }

  periodRoot() {
    const { periodRoot } = this.periodData();
    return periodRoot;
  }

  prevPeriodProof() {
    if (!this.usePrev) {
      throw Error('not set to use prev period in proofs');
    }

    const { casRoot } = this.periodData();

    const proof = [];

    // fees hash
    proof.push(bufferToHex(Buffer.alloc(32, 0)));
    proof.push(this.prevHash);
    proof.push(this.merkleRoot());
    proof.push(bufferToHex(casRoot));

    return proof;
  }

  // returns current period
  static verifyPrevPeriodProof(proof) {
    let result;
    result = Buffer.alloc(64, 0);
    // fees hash
    toBuffer(proof[0]).copy(result);
    // prevPeriod
    toBuffer(proof[1]).copy(result, 32);
    const metaRoot = keccak256(result);
    result = Buffer.alloc(64, 0);
    // blocks root
    toBuffer(proof[2]).copy(result);
    metaRoot.copy(result, 32);
    const consensusRoot = keccak256(result);
    result = Buffer.alloc(64, 0);
    toBuffer(consensusRoot).copy(result);
    toBuffer(proof[3]).copy(result, 32);
    return bufferToHex(keccak256(result));  
  }

  proof(tx) {
    let periodPos = -1;
    for (let i = 0; i < this.blockList.length; i++) {
      const pos = this.blockList[i].txHashList.indexOf(tx.hash());
      if (pos >= 0) {
        if (periodPos >= 0) {
          throw Error('tx doublespend');
        }
        periodPos = i;
      }
    }
    if (periodPos < 0) {
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
    const { casRoot, periodRoot, metaRoot } = this.periodData();

    // update the proof
    proof.push(bufferToHex(metaRoot));
    proof.push(bufferToHex(casRoot));
    proof[0] = periodRoot;
    return proof;
  }

  /**
   * Returns the block number interval for the period given block is included to.
   *
   * @param {Number} blockNumber block height of the block we are getting period block range for
   * @returns {Array} block interval in [startBlock: number, endBlock: number] format
   */
  static periodBlockRange(blockNumber) {
    const periodNum = Math.floor(blockNumber / BLOCKS_PER_PERIOD);
    return [
      periodNum * BLOCKS_PER_PERIOD,
      (periodNum + 1) * BLOCKS_PER_PERIOD - 1,
    ];
  }

 /**
 * Creates new Period with all the blocks from the given interval.
 *
 * @param {ExtendedWeb3} plasma instance of Leap Web3 or Leap Ethers
 * @param {Number} startBlock first block to include in the period
 * @param {Number} endBlock last block to include in the period
 * @param {PeriodOpts} periodOpts options for Period object as defined in Period constructor
 * @returns {Period} period
 */
  static periodForBlockRange(plasma, startBlock, endBlock, periodOpts = {}) {
    return Promise.all(
      Util.range(startBlock, endBlock).map(n => (plasma.eth || plasma).getBlock(n, true)),
    ).then((blocks) => {
      const blockList = blocks
        .filter(a => !!a)
        .map(({ number, timestamp, transactions }) =>
          Block.from(number, timestamp, transactions),
        );
      return new Period(null, blockList, periodOpts);
    });
  }

 /**
 * Creates {Period} where given tx was included.
 *
 * @param {ExtendedWeb3} plasma instance of Leap Web3
 * @param {Transaction} tx transaction to create {Period} for
 * @param {PeriodOpts} periodOpts options for Period object as defined in Period constructor
 * @returns {Period} period
 */
  static periodForTx(plasma, tx, periodOpts = {}) {
    const { blockNumber } = tx;
    const [startBlock, endBlock] = Period.periodBlockRange(blockNumber);
    return Period.periodForBlockRange(plasma, startBlock, endBlock, periodOpts);
  }

}
