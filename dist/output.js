'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.OUT_LENGTH = undefined;var _typeof2 = require('babel-runtime/helpers/typeof');var _typeof3 = _interopRequireDefault(_typeof2);var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _assert = require('assert');var _assert2 = _interopRequireDefault(_assert);
var _util = require('./util');var _util2 = _interopRequireDefault(_util);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

// 8 bytes - value, 20 bytes - address
var OUT_LENGTH = exports.OUT_LENGTH = 28;var

Output = function () {

  function Output(valueOrObject, address) {(0, _classCallCheck3.default)(this, Output);
    if ((typeof valueOrObject === 'undefined' ? 'undefined' : (0, _typeof3.default)(valueOrObject)) === 'object') {
      // transfer output
      if (valueOrObject.address) {
        this.value = valueOrObject.value;
        this.address = valueOrObject.address;
        if (valueOrObject.storageRoot) {
          this.storageRoot = valueOrObject.storageRoot;
        }
      } else {// computation request output
        this.value = valueOrObject.value;
        this.gasPrice = valueOrObject.gasPrice;
        // msgData is already buffer
        if (Buffer.isBuffer(valueOrObject.msgData)) {
          this.msgData = valueOrObject.msgData;
        } else {// msgData is yet string
          var dataHex = valueOrObject.msgData.replace('0x', '');
          var dataBuf = Buffer.alloc(dataHex.length / 2);
          dataBuf.write(dataHex, 'hex');
          this.msgData = dataBuf;
        }
      }
    } else {
      this.value = valueOrObject;
      this.address = address;
    }
  }

  /* eslint-disable class-methods-use-this */(0, _createClass3.default)(Output, [{ key: 'getSize', value: function getSize()
    {
      // transfer output
      if (this.address) {
        if (this.storageRoot) {
          return OUT_LENGTH + 32;
        }
        return OUT_LENGTH;
      }
      // computation request output
      return OUT_LENGTH - 14 + this.msgData.length;
    }
    /* eslint-enable class-methods-use-this */ }, { key: 'toJSON', value: function toJSON()

    {
      // transfer output
      if (this.address) {
        var rsp = {
          address: this.address,
          value: this.value };

        if (this.storageRoot) {
          rsp.storageRoot = this.storageRoot;
        }
        return rsp;
      }
      // computation request output
      return {
        value: this.value,
        msgData: '0x' + this.msgData.toString('hex'),
        gasPrice: this.gasPrice };

    }

    /**
       * Instantiate output from json object.
       * @param {Object} json
       * @returns {Outpoint}
       */ }, { key: 'toRaw', value: function toRaw()















































    {
      var dataBuf = Buffer.alloc(this.getSize());
      _util2.default.writeUint64(dataBuf, this.value, 0);
      // transfer output
      if (this.address) {
        dataBuf.write(this.address.replace('0x', ''), 8, 'hex');
        if (this.storageRoot) {
          dataBuf.write(this.storageRoot.replace('0x', ''), 28, 'hex');
        }
      } else {// computation request output
        dataBuf.writeUInt32BE(this.gasPrice, 8);
        dataBuf.writeUInt16BE(this.msgData.length, 12);
        this.msgData.copy(dataBuf, 14, 0, this.msgData.length);
      }
      return dataBuf;
    } }], [{ key: 'fromJSON', value: function fromJSON(json) {(0, _assert2.default)(json, 'Output data is required.');return new Output(json);} /**
                                                                                                                                                 * Instantiate output from serialized data.
                                                                                                                                                 * @param {Buffer} data
                                                                                                                                                 * @param {offset} offset to read from in buffer
                                                                                                                                                 * @param {isComp} flag where 0 is transfer output,
                                                                                                                                                 *                            1 is comp request
                                                                                                                                                 *                            2 is comp response
                                                                                                                                                 * @returns {Output}
                                                                                                                                                 */ }, { key: 'fromRaw', value: function fromRaw(buf) {var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;var isComp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;var value = _util2.default.readUint64(buf, offset); // computation request output
      if (isComp === 1) {var gasPrice = buf.readUInt32BE(offset + 8);var length = buf.readUInt16BE(offset + 12);if (offset + 14 + length > buf.length) {throw new Error('Length out of bounds.');}var msgData = Buffer.alloc(length);buf.copy(msgData, 0, offset + 14, offset + 14 + length);return new Output({ value: value, msgData: msgData, gasPrice: gasPrice });}var address = '0x' + buf.slice(offset + 8, offset + 28).toString('hex');if (isComp === 2) {if (offset + 60 > buf.length) {throw new Error('Length out of bounds.');}var storageRoot = '0x' + buf.slice(offset + 28, offset + 60).toString('hex');return new Output({ value: value, address: address, storageRoot: storageRoot });} // transfer output
      return new Output(value, address);} }]);return Output;}();exports.default = Output;