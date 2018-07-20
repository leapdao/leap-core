'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.OUT_LENGTH = undefined;var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {return typeof obj;} : function (obj) {return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;};var _createClass = function () {function defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}return function (Constructor, protoProps, staticProps) {if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;};}();
/**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * This source code is licensed under the GNU Affero General Public License,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * version 3, found in the LICENSE file in the root directory of this source
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          * tree.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          */

var _assert = require('assert');var _assert2 = _interopRequireDefault(_assert);
var _util = require('./util');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}

// 8 bytes - value, 20 bytes - address, 2 bytes color
var OUT_LENGTH = exports.OUT_LENGTH = 30;var

Output = function () {

  function Output(valueOrObject, address, color) {_classCallCheck(this, Output);
    if ((typeof valueOrObject === 'undefined' ? 'undefined' : _typeof(valueOrObject)) === 'object') {
      if (valueOrObject.address) {
        this.value = valueOrObject.value;
        this.color = valueOrObject.color;
        this.address = valueOrObject.address;

        if (valueOrObject.storageRoot) {// computation response output
          this.storageRoot = valueOrObject.storageRoot;
        }

        if (valueOrObject.msgData) {// computation request output
          this.gasPrice = valueOrObject.gasPrice;
          if (Buffer.isBuffer(valueOrObject.msgData)) {// msgData is already buffer
            this.msgData = valueOrObject.msgData;
          } else {// msgData is yet string
            var dataHex = valueOrObject.msgData.replace('0x', '');
            var dataBuf = Buffer.alloc(dataHex.length / 2);
            dataBuf.write(dataHex, 'hex');
            this.msgData = dataBuf;
          }
        }
      }
    } else {
      this.value = valueOrObject;
      this.address = address;
      this.color = color;
    }
  }

  /* eslint-disable class-methods-use-this */_createClass(Output, [{ key: 'getSize', value: function getSize()
    {
      if (this.storageRoot) {
        return OUT_LENGTH + 32;
      }
      // computation request output
      if (this.msgData) {
        return OUT_LENGTH + 6 + this.msgData.length;
      }
      // transfer output
      return OUT_LENGTH;
    }
    /* eslint-enable class-methods-use-this */ }, { key: 'toJSON', value: function toJSON()

    {
      var rsp = {
        address: this.address,
        value: this.value,
        color: this.color };

      if (this.storageRoot) {
        rsp.storageRoot = this.storageRoot;
      }
      if (this.msgData) {
        rsp.msgData = '0x' + this.msgData.toString('hex');
        rsp.gasPrice = this.gasPrice;
      }
      return rsp;
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
      dataBuf.write(this.address.replace('0x', ''), 10, 'hex');

      // computation request output
      if (this.msgData) {
        dataBuf.writeUInt32BE(this.gasPrice, 30);
        dataBuf.writeUInt16BE(this.msgData.length, 34);
        this.msgData.copy(dataBuf, 36, 0, this.msgData.length);
      } else {// transfer output
        if (this.storageRoot) {
          dataBuf.write(this.storageRoot.replace('0x', ''), 30, 'hex');
        }
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
                                                                                                                                                 */ }, { key: 'fromRaw', value: function fromRaw(buf) {var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;var isComp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;var value = (0, _util.readUint64)(buf, offset);var color = buf.readUInt16BE(offset + 8);var address = '0x' + buf.slice(offset + 10, offset + 30).toString('hex'); // computation request output
      if (isComp === 1) {var gasPrice = buf.readUInt32BE(offset + 30);var length = buf.readUInt16BE(offset + 34);if (offset + 36 + length > buf.length) {throw new Error('Length out of bounds.');}var msgData = Buffer.alloc(length);buf.copy(msgData, 0, offset + 36, offset + 36 + length);return new Output({ value: value, color: color, address: address, msgData: msgData, gasPrice: gasPrice });}if (isComp === 2) {if (offset + 62 > buf.length) {throw new Error('Length out of bounds.');}var storageRoot = '0x' + buf.slice(offset + 30, offset + 62).toString('hex');return new Output({ value: value, color: color, address: address, storageRoot: storageRoot });} // transfer output
      return new Output(value, address, color);} }]);return Output;}();exports.default = Output;