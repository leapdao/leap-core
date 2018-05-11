'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _assert = require('assert');var _assert2 = _interopRequireDefault(_assert);
var _encoding = require('./encoding');var _encoding2 = _interopRequireDefault(_encoding);
var _util = require('./util');var _util2 = _interopRequireDefault(_util);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}var


Outpoint = function () {
  function Outpoint(hash, index) {(0, _classCallCheck3.default)(this, Outpoint);
    if (hash) {
      if (typeof hash === 'string') {
        (0, _assert2.default)(_util2.default.isBytes32(hash), 'Hash must be hex256.');
        this.hash = Buffer.from(hash.replace('0x', ''), 'hex');
      }
      if (Buffer.isBuffer(hash)) {
        (0, _assert2.default)(hash.length === 32, 'Hash buffer length must be 32 bytes.');
        this.hash = hash;
      }
      (0, _assert2.default)(this.hash, 'Hash must be string or Buffer.');
      (0, _assert2.default)(_util2.default.isU8(index), 'Index must be a uint8.');
      this.index = index;
    } else {
      this.hash = _encoding2.default.ZERO_HASH;
    }
  }

  /**
     * Test an object to see if it is an outpoint.
     * @param {Object} obj
     * @returns {Boolean}
     */(0, _createClass3.default)(Outpoint, [{ key: 'isOutpoint', value: function isOutpoint(
    obj) {
      return obj instanceof Outpoint;
    }

    /**
       * Test equality against another outpoint.
       * @param {Outpoint} prevout
       * @returns {Boolean}
       */ }, { key: 'equals', value: function equals(
    prevout) {
      (0, _assert2.default)(this.isOutpoint(prevout));
      return this.hash === prevout.hash &&
      this.index === prevout.index;
    }

    /**
       * Get little-endian hash.
       * @returns {Hash}
       */ }, { key: 'txid', value: function txid()

    {
      return '0x' + this.hash.toString('hex');
    }

    /**
       * Calculate size of outpoint.
       * @returns {Number}
       */ }, { key: 'getSize', value: function getSize()

    {
      return 33;
    }

    /**
       * Instantiate outpoint from serialized data.
       * @param {Buffer} data
       * @returns {Outpoint}
       */ }], [{ key: 'fromRaw', value: function fromRaw(
    buf) {
      return new Outpoint(buf.slice(0, 32), buf.readUInt8(32));
    }

    /**
       * Instantiate outpoint from json object.
       * @param {Object} json
       * @returns {Outpoint}
       */ }, { key: 'fromJSON', value: function fromJSON(
    json) {
      (0, _assert2.default)(json, 'Outpoint data is required.');
      return new Outpoint(json.hash, json.index);
    }

    /**
       * Inject properties from tx.
       * @private
       * @param {TX} tx
       * @param {Number} index
       */ }, { key: 'fromTX', value: function fromTX(
    tx, index) {
      (0, _assert2.default)(tx);
      (0, _assert2.default)(typeof index === 'number');
      (0, _assert2.default)(index >= 0);
      return new Outpoint(tx.hash('hex'), index);
    } }]);return Outpoint;}();exports.default = Outpoint;module.exports = exports['default'];