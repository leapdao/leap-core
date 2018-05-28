'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.OUT_LENGTH = undefined;var _typeof2 = require('babel-runtime/helpers/typeof');var _typeof3 = _interopRequireDefault(_typeof2);var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _assert = require('assert');var _assert2 = _interopRequireDefault(_assert);
var _util = require('./util');var _util2 = _interopRequireDefault(_util);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

// 8 bytes - value, 20 bytes - address
var OUT_LENGTH = exports.OUT_LENGTH = 28;var

Output = function () {

  function Output(valueOrObject, address) {(0, _classCallCheck3.default)(this, Output);
    if ((typeof valueOrObject === 'undefined' ? 'undefined' : (0, _typeof3.default)(valueOrObject)) === 'object') {
      this.value = valueOrObject.value;
      this.address = valueOrObject.address;
    } else {
      this.value = valueOrObject;
      this.address = address;
    }
  }

  /* eslint-disable class-methods-use-this */(0, _createClass3.default)(Output, [{ key: 'getSize', value: function getSize()
    {
      return OUT_LENGTH;
    }
    /* eslint-enable class-methods-use-this */ }, { key: 'toJSON', value: function toJSON()

    {
      return {
        address: this.address,
        value: this.value };

    }

    /**
       * Instantiate output from json object.
       * @param {Object} json
       * @returns {Outpoint}
       */ }, { key: 'toRaw', value: function toRaw()
















    {
      var dataBuf = Buffer.alloc(this.getSize());
      _util2.default.writeUint64(dataBuf, this.value, 0);
      dataBuf.write(this.address.replace('0x', ''), 8, 'hex');
      return dataBuf;
    } }], [{ key: 'fromJSON', value: function fromJSON(json) {(0, _assert2.default)(json, 'Output data is required.');return new Output(json);} /**
                                                                                                                                                 * Instantiate output from serialized data.
                                                                                                                                                 * @param {Buffer} data
                                                                                                                                                 * @returns {Output}
                                                                                                                                                 */ }, { key: 'fromRaw', value: function fromRaw(buf) {var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;var value = _util2.default.readUint64(buf, offset);var addr = '0x' + buf.slice(offset + 8, offset + 28).toString('hex');return new Output(value, addr);} }]);return Output;}();exports.default = Output;