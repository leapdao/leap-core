'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _createClass = function () {function defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}return function (Constructor, protoProps, staticProps) {if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;};}();
/**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * This source code is licensed under the GNU Affero General Public License,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * version 3, found in the LICENSE file in the root directory of this source
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * tree.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  */

var _ethereumjsUtil = require('ethereumjs-util');
var _merkleTree = require('./merkleTree');var _merkleTree2 = _interopRequireDefault(_merkleTree);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}var

Period = function () {
  function Period(prevHash, blocks) {var _this = this;_classCallCheck(this, Period);
    this.prevHash = prevHash;
    this.blockList = [];
    this.blockHashList = [];
    if (blocks) {
      blocks.forEach(function (block) {return _this.addBlock(block);});
    }
  }_createClass(Period, [{ key: 'addBlock', value: function addBlock(

    block) {
      if (this.blockHashList.indexOf(block.hash()) > -1) {
        throw Error('block already contained');
      }
      this.blockList.push(block);
      this.blockHashList.push(block.hash());
      // invalidate existing tree
      // todo: optimize not to recalculate the whole tree on every tx added
      this.merkleTree = null;
      return this;
    } }, { key: 'getMerkleTree', value: function getMerkleTree()

    {
      if (this.blockList.length === 0) {
        throw Error('no blocks contained');
      }
      if (!this.merkleTree) {
        var hashBufs = this.blockList.map(function (block) {return block.getMerkleTree().getRoot();});
        this.merkleTree = new _merkleTree2.default(hashBufs);
      }
      return this.merkleTree;
    } }, { key: 'merkleRoot', value: function merkleRoot()

    {
      return this.getMerkleTree().getHexRoot();
    } }, { key: 'proof', value: function proof(

    tx) {
      var blockPos = void 0;
      var periodPos = -1;
      for (var i = 0; i < this.blockList.length; i++) {
        var pos = this.blockList[i].txHashList.indexOf(tx.hash());
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
      var blockProof = this.getMerkleTree().
      getProof(this.blockList[periodPos].getMerkleTree().getRoot()).
      map(function (buff) {return (0, _ethereumjsUtil.bufferToHex)(buff);});

      // get tx proof in block
      var proof = this.blockList[periodPos].proof(tx, periodPos);

      // merge and return
      blockProof.forEach(function (elem) {return proof.push(elem);});

      // replace root
      proof[0] = this.merkleRoot();
      return proof;
    } }]);return Period;}();exports.default = Period;module.exports = exports['default'];