'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);








var _ethereumjsUtil = require('ethereumjs-util');
var _merkleTree = require('./merkleTree');var _merkleTree2 = _interopRequireDefault(_merkleTree);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} /**
                                                                                                                                                                                                * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
                                                                                                                                                                                                *
                                                                                                                                                                                                * This source code is licensed under the GNU Affero General Public License,
                                                                                                                                                                                                * version 3, found in the LICENSE file in the root directory of this source 
                                                                                                                                                                                                * tree.
                                                                                                                                                                                                */var Period = function () {function Period(prevHash, blocks) {var _this = this;(0, _classCallCheck3.default)(this, Period);this.prevHash = prevHash;this.blockList = [];this.blockHashList = [];
    if (blocks) {
      blocks.forEach(function (block) {return _this.addBlock(block);});
    }
  }(0, _createClass3.default)(Period, [{ key: 'addBlock', value: function addBlock(

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