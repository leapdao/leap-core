'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _log = require('babel-runtime/core-js/math/log2');var _log2 = _interopRequireDefault(_log);var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _ethereumjsUtil = require('ethereumjs-util');var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);
var _merkleTree = require('./merkleTree');var _merkleTree2 = _interopRequireDefault(_merkleTree);
var _util = require('./util');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}var

Block = function () {
  function Block(parent, height) {(0, _classCallCheck3.default)(this, Block);
    this.parent = parent;
    this.height = height;
    this.txList = [];
    this.txHashList = [];
  }(0, _createClass3.default)(Block, [{ key: 'addTx', value: function addTx(

    tx) {
      if (this.txHashList.indexOf(tx.hash()) > -1) {
        throw Error('tx already contained');
      }
      this.txList.push(tx);
      this.txHashList.push(tx.hash());
      // invalidate existing tree
      // todo: optimize not to recalculate the whole tree on every tx added
      this.merkleTree = null;
      return this;
    } }, { key: 'getMerkleTree', value: function getMerkleTree()

    {
      if (!this.merkleTree) {
        var hashBufs = this.txList.map(function (tx) {return tx.hashBuf();});
        this.merkleTree = new _merkleTree2.default(hashBufs);
      }
      return this.merkleTree;
    } }, { key: 'merkleRoot', value: function merkleRoot()

    {
      return this.getMerkleTree().getHexRoot();
    } }, { key: 'unsignedHeader', value: function unsignedHeader(

    payload) {
      payload.write(this.parent.replace('0x', ''), 0, 'hex');
      (0, _util.writeUint64)(payload, this.height, 32);
      payload.write(this.merkleRoot().replace('0x', ''), 40, 'hex');
      return payload;
    } }, { key: 'sigHash', value: function sigHash()

    {
      return _ethereumjsUtil2.default.sha3(this.unsignedHeader(Buffer.alloc(72, 0)));
    } }, { key: 'sign', value: function sign(

    privKey) {
      var privBuf = (0, _ethereumjsUtil.toBuffer)(privKey);
      var sig = _ethereumjsUtil2.default.ecsign(this.sigHash(), privBuf);
      this.v = sig.v;
      this.r = sig.r;
      this.s = sig.s;
      return [sig.v, (0, _ethereumjsUtil.bufferToHex)(sig.r), (0, _ethereumjsUtil.bufferToHex)(sig.s)];
    } }, { key: 'hash', value: function hash()

    {
      if (!this.v || !this.r || !this.s) {
        throw new Error('not signed yet');
      }
      var payload = this.unsignedHeader(Buffer.alloc(137, 0));

      payload.writeUInt8(this.v, 72);
      this.r.copy(payload, 73);
      this.s.copy(payload, 105);
      return _ethereumjsUtil2.default.bufferToHex(_ethereumjsUtil2.default.sha3(payload));
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
  }, { key: 'proof', value: function proof(tx) {var proofOffset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var txData = tx.toRaw();
      var pos = this.txHashList.indexOf(tx.hash());
      if (pos < 0) {
        throw Error('tx not in the block');
      }
      if (proofOffset > 0) {
        // 1. find size of block (rounded pow 2)
        var nextPow = this.txList.length - 1;
        nextPow |= nextPow >> 1;
        nextPow |= nextPow >> 2;
        nextPow |= nextPow >> 4;
        nextPow |= nextPow >> 8;
        nextPow |= nextPow >> 16;
        nextPow++;
        // 2. shift proofOffset
        // 3. add numbers
        pos += proofOffset << (0, _log2.default)(nextPow);
      }
      var slices = [];
      slices.push(this.hash());

      // Slices with tx metadata, v-sig and tx data
      // metadata size is 13 bytes (see proof structure above)
      var metadataAndTxLength = 13 + txData.length;
      // align to 32 bytes, so that e.g. 38 bytes will be stored in 64 bytes buffer
      var doubleWordAlignedLength = metadataAndTxLength + (32 - metadataAndTxLength % 32);
      var txPayload = Buffer.alloc(doubleWordAlignedLength);
      // tx length
      txPayload.writeUInt32BE(txData.length, 0);
      // byte offset of the tx data in proof bytes
      var offset = 32 + (txPayload.length - txData.length);
      txPayload.writeUInt8(offset, 0);
      // offset of the merkle proof in array of 32byte slices
      var sliceCount = Math.floor(txData.length / 32) + 1;
      txPayload.writeUInt8((txData.length % 32 > 20 ? sliceCount + 1 : sliceCount) + 1, 1);
      // tx index in the block
      (0, _util.writeUint64)(txPayload, pos, 4);
      // copy tx data tighly aligned to the right boundary of the buffer
      txData.copy(txPayload, txPayload.length - txData.length, 0);

      // split txdata buffer in 32 byte words as hex strings
      for (var i = 0; i < doubleWordAlignedLength / 32; i++) {
        slices.push(
        (0, _ethereumjsUtil.bufferToHex)(txPayload.slice(i * 32, i * 32 + 32)));

      }

      // get merkle proofs
      var proofs = this.getMerkleTree().
      getProof(tx.hashBuf()).
      map(function (buff) {return (0, _ethereumjsUtil.bufferToHex)(buff);});

      // Add slices with proofs and return
      return slices.concat(proofs);
    } }]);return Block;}();exports.default = Block;module.exports = exports['default'];