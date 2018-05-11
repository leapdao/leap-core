'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _ethereumjsUtil = require('ethereumjs-util');var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var EMPTY = Buffer.alloc(32, 0);
var IN_LENGTH = 33 + 65;var

Signer = function () {
  function Signer(values, txData, type, height) {(0, _classCallCheck3.default)(this, Signer);
    this.values = values;
    this.txData = txData;
    this.type = type;
    this.height = height;
  }(0, _createClass3.default)(Signer, [{ key: 'sign', value: function sign(

    privKeys) {
      if (privKeys.length !== this.values[0].length) {
        throw Error('amount of private keys doesn\'t mathch amount of inputs');
      }
      for (var i = 0; i < privKeys.length; i += 1) {
        var privBuf = new Buffer(privKeys[i].replace('0x', ''), 'hex');
        var sig = _ethereumjsUtil2.default.ecsign(this.sigHashBuf(), privBuf);
        sig.r.copy(this.txData, 43 + i * IN_LENGTH);
        sig.s.copy(this.txData, 75 + i * IN_LENGTH);
        this.txData.writeInt8(sig.v, 107 + i * IN_LENGTH);
      }
      return this;
    } }, { key: 'hashBuf', value: function hashBuf()

    {
      if (this.txData.slice(34, 66).equals(EMPTY)) {
        throw Error('not signed yet');
      }
      return _ethereumjsUtil2.default.sha3(this.txData);
    } }, { key: 'hash', value: function hash()

    {
      return '0x' + this.hashBuf().toString('hex');
    } }, { key: 'sigHashBuf', value: function sigHashBuf()

    {
      var noSigs = Buffer.alloc(this.txData.length, 0);
      this.txData.copy(noSigs, 0, 0, 10);
      var start = void 0;
      for (var i = 0; i < this.values[0].length; i += 1) {
        start = 10 + i * IN_LENGTH;
        this.txData.copy(noSigs, start, start, start + 33);
      }
      start = 10 + this.values[0].length * IN_LENGTH;
      this.txData.copy(noSigs, start, start, this.txData.length);
      return _ethereumjsUtil2.default.sha3(noSigs);
    } }, { key: 'toJSON', value: function toJSON()

    {
      var rv = {
        hash: this.hash(),
        type: this.type };

      if (this.type == 1) {
        rv.outs = [{
          value: this.values[0],
          addr: this.values[1] }];

      }
      if (this.type == 2) {
        rv.ins = [{
          depositId: this.values[0] }];


        rv.outs = [{
          value: this.values[1],
          addr: this.values[2] }];

      }
      if (this.type > 2) {
        rv.ins = this.values[0];
        // update txData
        for (var i = 0; i < this.values[0].length; i += 1) {
          new Buffer(this.values[0][i].r.replace('0x', ''), 'hex').copy(this.txData, 43 + i * IN_LENGTH);
          new Buffer(this.values[0][i].s.replace('0x', ''), 'hex').copy(this.txData, 75 + i * IN_LENGTH);
          this.txData.writeInt8(this.values[0][i].v, 107 + i * IN_LENGTH);
        }
        rv.hash = this.hash();
        rv.outs = this.values[1];
        rv.height = this.height;
      }
      return rv;
    } }, { key: 'sigHash', value: function sigHash()

    {
      return '0x' + this.sigHashBuf().toString('hex');
    } }, { key: 'hex', value: function hex()

    {
      return '0x' + this.txData.toString('hex');
    } }, { key: 'buf', value: function buf()

    {
      return this.txData;
    } }]);return Signer;}();exports.default = Signer;module.exports = exports['default'];