'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _ethereumjsUtil = require('ethereumjs-util');var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var EMPTY = Buffer.alloc(32, 0);
var IN_LENGTH = 33 + 65;
var OUT_LENGTH = 28;var

Signer = function () {
  function Signer(values, txData, type) {(0, _classCallCheck3.default)(this, Signer);
    this.values = values;
    this.txData = txData;
    this.type = type;
  }(0, _createClass3.default)(Signer, [{ key: 'sign', value: function sign(

    privKeys) {
      if (privKeys.length != this.values[0].length) {
        throw Error('amount of private keys doesn\'t mathch amount of inputs');
      }
      for (var i = 0; i < privKeys.length; i++) {
        var privBuf = new Buffer(privKeys[i].replace('0x', ''), 'hex');
        var hash = _ethereumjsUtil2.default.sha3(this.sigHashBuf());
        var sig = _ethereumjsUtil2.default.ecsign(hash, privBuf);
        sig.r.copy(this.txData, 43 + i * IN_LENGTH);
        sig.s.copy(this.txData, 75 + i * IN_LENGTH);
        this.txData.writeInt8(sig.v, 107 + i * IN_LENGTH);
      }
      return this;
    } }, { key: 'hash', value: function hash()

    {
      if (this.txData.slice(34, 66).equals(EMPTY)) {
        throw Error('not signed yet');
      }
      var hash = _ethereumjsUtil2.default.sha3(this.txData);
      return '0x' + hash.toString('hex');
    } }, { key: 'sigHashBuf', value: function sigHashBuf()

    {
      var noSigs = Buffer.alloc(this.txData.length, 0);
      this.txData.copy(noSigs, 0, 0, 10);
      var start = void 0;
      for (var i = 0; i < this.values[0].length; i++) {
        start = 10 + i * IN_LENGTH;
        this.txData.copy(noSigs, start, start, 33);
      }
      start = 10 + this.values[0].length * IN_LENGTH;
      this.txData.copy(noSigs, start, start, this.txData.length - start);
      return _ethereumjsUtil2.default.sha3(noSigs);
    } }, { key: 'sigHash', value: function sigHash()

    {
      return '0x' + this.sigHashBuf().toString('hex');
    } }, { key: 'hex', value: function hex()

    {
      return '0x' + this.txData.toString('hex');
    } }]);return Signer;}();exports.default = Signer;module.exports = exports['default'];