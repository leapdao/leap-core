'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.OUT_LENGTH = undefined;var _typeof2 = require('babel-runtime/helpers/typeof');var _typeof3 = _interopRequireDefault(_typeof2);var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);








var _assert = require('assert');var _assert2 = _interopRequireDefault(_assert);
var _util = require('./util');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

// 8 bytes - value, 20 bytes - address, 2 bytes color
/**
 * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */var OUT_LENGTH = exports.OUT_LENGTH = 30;var Output = function () {function Output(valueOrObject, address, color) {(0, _classCallCheck3.default)(this, Output);if ((typeof valueOrObject === 'undefined' ? 'undefined' : (0, _typeof3.default)(valueOrObject)) === 'object') {// transfer output
      if (valueOrObject.address) {
        this.value = valueOrObject.value;
        this.color = valueOrObject.color;
        this.address = valueOrObject.address;
        if (valueOrObject.storageRoot) {
          this.storageRoot = valueOrObject.storageRoot;
        }
      } else {// computation request output
        this.value = valueOrObject.value;
        this.color = valueOrObject.color;
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
      this.color = color;
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
          value: this.value,
          color: this.color };

        if (this.storageRoot) {
          rsp.storageRoot = this.storageRoot;
        }
        return rsp;
      }
      // computation request output
      return {
        value: this.value,
        color: this.color,
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
      (0, _util.writeUint64)(dataBuf, this.value, 0);
      dataBuf.writeUInt16BE(this.color, 8);
      // transfer output
      if (this.address) {
        dataBuf.write(this.address.replace('0x', ''), 10, 'hex');
        if (this.storageRoot) {
          dataBuf.write(this.storageRoot.replace('0x', ''), 30, 'hex');
        }
      } else {// computation request output
        dataBuf.writeUInt32BE(this.gasPrice, 10);
        dataBuf.writeUInt16BE(this.msgData.length, 14);
        this.msgData.copy(dataBuf, 16, 0, this.msgData.length);
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
                                                                                                                                                 */ }, { key: 'fromRaw', value: function fromRaw(buf) {var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;var isComp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;var value = (0, _util.readUint64)(buf, offset);var color = buf.readUInt16BE(offset + 8); // computation request output
      if (isComp === 1) {var gasPrice = buf.readUInt32BE(offset + 10);var length = buf.readUInt16BE(offset + 14);if (offset + 16 + length > buf.length) {throw new Error('Length out of bounds.');}var msgData = Buffer.alloc(length);buf.copy(msgData, 0, offset + 16, offset + 16 + length);return new Output({ value: value, color: color, msgData: msgData, gasPrice: gasPrice });}var address = '0x' + buf.slice(offset + 10, offset + 30).toString('hex');if (isComp === 2) {if (offset + 62 > buf.length) {throw new Error('Length out of bounds.');}var storageRoot = '0x' + buf.slice(offset + 30, offset + 62).toString('hex');return new Output({ value: value, color: color, address: address, storageRoot: storageRoot });} // transfer output
      return new Output(value, address, color);} }]);return Output;}();exports.default = Output;