'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.OUTPOINT_LENGTH = undefined;var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _assert = require('assert');var _assert2 = _interopRequireDefault(_assert);
var _encoding = require('./encoding');var _encoding2 = _interopRequireDefault(_encoding);
var _util = require('./util');var _util2 = _interopRequireDefault(_util);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}


// 32 bytes prev tx + 1 byte output pos
var OUTPOINT_LENGTH = exports.OUTPOINT_LENGTH = 33;

/*
                                                     * Helpers
                                                     */
function strcmp(a, b) {
  var len = Math.min(a.length, b.length);

  for (var i = 0; i < len; i++) {
    if (a[i] < b[i]) {return -1;}
    if (a[i] > b[i]) {return 1;}
  }

  if (a.length < b.length) {return -1;}

  if (a.length > b.length) {return 1;}

  return 0;
}var

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
     */(0, _createClass3.default)(Outpoint, [{ key: 'equals',




    /**
                                                               * Test equality against another outpoint.
                                                               * @param {Outpoint} prevout
                                                               * @returns {Boolean}
                                                               */value: function equals(
    prevout) {
      (0, _assert2.default)(Outpoint.isOutpoint(prevout));
      return this.hash === prevout.hash &&
      this.index === prevout.index;
    }

    /**
       * Compare against another outpoint (BIP69).
       * @param {Outpoint} prevout
       * @returns {Number}
       */ }, { key: 'compare', value: function compare(
    prevout) {
      (0, _assert2.default)(Outpoint.isOutpoint(prevout));

      var cmp = strcmp(this.txid(), prevout.txid());

      if (cmp !== 0) {return cmp;}

      return this.index - prevout.index;
    }

    /**
       * Get little-endian hash.
       * @returns {Hash}
       */ }, { key: 'txid', value: function txid()

    {
      return '0x' + this.hash.toString('hex');
    }

    /* eslint-disable class-methods-use-this */ }, { key: 'getSize', value: function getSize()
    {
      return OUTPOINT_LENGTH;
    }
    /* eslint-enable class-methods-use-this */ }, { key: 'getUtxoId', value: function getUtxoId()

    {
      var dataBuf = Buffer.alloc(32);
      this.hash.copy(dataBuf, 0);
      dataBuf.writeInt32BE(0, 0);
      dataBuf.writeInt32BE(0, 4);
      dataBuf.writeInt32BE(0, 8);
      dataBuf.writeInt32BE(0, 12);
      dataBuf.writeUInt8(this.index, 16);
      return (0, _util.toHexString)(dataBuf);
    }

    /**
       * Instantiate outpoint from serialized data.
       * @param {Buffer} data
       * @returns {Outpoint}
       */ }, { key: 'toRaw', value: function toRaw(










    buf, offset) {
      var dataBuf = buf || Buffer.alloc(this.getSize());
      var off = offset || 0;
      this.hash.copy(dataBuf, 0 + off);
      dataBuf.writeUInt8(this.index, 32 + off);
      return dataBuf;
    }

    // Returns serialized tx bytes as hex string
  }, { key: 'hex', value: function hex() {
      return (0, _util.toHexString)(this.toRaw());
    }

    /**
       * Instantiate outpoint from json object.
       * @param {Object} json
       * @returns {Outpoint}
       */ }], [{ key: 'isOutpoint', value: function isOutpoint(obj) {return obj instanceof Outpoint;} }, { key: 'fromRaw', value: function fromRaw(raw) {var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;var dataBuf = raw;if (!Buffer.isBuffer(raw)) {var dataHex = raw.replace('0x', '');dataBuf = Buffer.alloc(dataHex.length / 2);dataBuf.write(dataHex, 'hex');}return new Outpoint(dataBuf.slice(0 + offset, 32 + offset), dataBuf.readUInt8(32 + offset));} }, { key: 'fromJSON', value: function fromJSON(
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
    } }]);return Outpoint;}();exports.default = Outpoint;