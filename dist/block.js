'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _ethereumjsUtil = require('ethereumjs-util');var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var MAX_UINT32 = 0xFFFFFFFF;var

Block = function () {
  function Block(parent, height) {(0, _classCallCheck3.default)(this, Block);
    this.parent = parent;
    this.height = height;
    this.txList = [];
  }(0, _createClass3.default)(Block, [{ key: 'addTx', value: function addTx(

    tx) {
      if (this.txList.indexOf(tx.hash()) > -1) {
        throw Error('tx already contained');
      }
      this.txList.push(tx);
      return this;
    } }, { key: 'hashTree', value: function hashTree(

    list) {
      if (list.length % 2 !== 0) {
        throw Error('uneven number of tx');
      }
      var payload = void 0;
      var rv = [];
      for (var i = 0; i < list.length; i += 2) {
        payload = Buffer.alloc(64);
        list[i].copy(payload, 0);
        list[i + 1].copy(payload, 32);
        rv.push(_ethereumjsUtil2.default.sha3(payload));
      }
      if (rv.length === 1) {
        return '0x' + rv[0].toString('hex');
      }
      return this.hashTree(rv);
    } }, { key: 'merkleRoot', value: function merkleRoot()

    {
      var hashBufs = [];
      for (var i = 0; i < this.txList.length; i += 1) {
        hashBufs.push(this.txList[i].hashBuf());
      }
      if (hashBufs.length % 2 !== 0) {
        hashBufs.push(Buffer.alloc(32, 0));
      }
      return this.hashTree(hashBufs);
    } }, { key: 'unsigedHeader', value: function unsigedHeader(

    payload) {
      payload.write(this.parent.replace('0x', ''), 0, 'hex');
      var big = ~~(this.height / MAX_UINT32); // eslint-disable-line no-bitwise
      payload.writeUInt32BE(big, 32);
      var low = this.height % MAX_UINT32 - big;
      payload.writeUInt32BE(low, 36);
      payload.write(this.merkleRoot().replace('0x', ''), 40, 'hex');
      return payload;
    } }, { key: 'sigHash', value: function sigHash()

    {
      return _ethereumjsUtil2.default.sha3(this.unsigedHeader(Buffer.alloc(72, 0)));
    } }, { key: 'sign', value: function sign(

    privKey) {
      var privBuf = new Buffer(privKey.replace('0x', ''), 'hex');
      var sig = _ethereumjsUtil2.default.ecsign(this.sigHash(), privBuf);
      this.v = sig.v;
      this.r = sig.r;
      this.s = sig.s;
      return [sig.v, '0x' + sig.r.toString('hex'), '0x' + sig.s.toString('hex')];
    } }, { key: 'hash', value: function hash()

    {
      if (!this.v || !this.r || !this.s) {
        throw new Error('not signed yet');
      }
      var payload = this.unsigedHeader(Buffer.alloc(137, 0));

      payload.writeUInt8(this.v, 72);
      this.r.copy(payload, 73);
      this.s.copy(payload, 105);
      return _ethereumjsUtil2.default.bufferToHex(_ethereumjsUtil2.default.sha3(payload));
    }

    //  _txData = [ 32b blockHash, 32b r, 32b s, (4b offset, 8b pos, 1b v, ..00.., 1b txData),
    // 32b txData, 32b proof, 32b proof ]
  }, { key: 'proof', value: function proof(txData, pos, _proof) {
      var slices = [];
      slices.push(this.hash());
      slices.push('0x' + this.r.toString('hex'));
      slices.push('0x' + this.s.toString('hex'));

      var sliceCount = Math.floor(txData.length / 32) + 1;

      var payload = Buffer.alloc(32);
      payload.writeUInt32BE(txData.length, 0);
      payload.writeUInt8(sliceCount + 3, 1);
      var big = ~~(pos / MAX_UINT32); // eslint-disable-line no-bitwise
      payload.writeUInt32BE(big, 4);
      var low = pos % MAX_UINT32 - big; // eslint-disable-line no-bitwise
      payload.writeUInt32BE(low, 8);
      payload.writeUInt8(this.v, 13);
      txData.copy(payload, 32 - txData.length % 32, 0, txData.length % 32);

      slices.push(_ethereumjsUtil2.default.bufferToHex(payload));

      for (var i = 1; i < sliceCount; i += 1) {
        slices.push(_ethereumjsUtil2.default.bufferToHex(txData.slice(txData.length % 32 + (i - 1) * 32,
        txData.length % 32 + i * 32))); // eslint-disable-line no-bitwise
      }
      for (var _i = 0; _i < _proof.length; _i += 1) {
        slices.push(_proof[_i]);
      }
      return slices;
    } }]);return Block;}();exports.default = Block;module.exports = exports['default'];