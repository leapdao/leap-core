'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _createClass = function () {function defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}return function (Constructor, protoProps, staticProps) {if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;};}();
/**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * This source code is licensed under the GNU Affero General Public License,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * version 3, found in the LICENSE file in the root directory of this source
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * tree.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  */

var _assert = require('assert');var _assert2 = _interopRequireDefault(_assert);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}var

Util = function () {function Util() {_classCallCheck(this, Util);}_createClass(Util, null, [{ key: 'isUint',

    /**
                                                                                                              * Test whether an object is a uint.
                                                                                                              * @param {Number?} value
                                                                                                              * @returns {Boolean}
                                                                                                              */value: function isUint(
    value) {
      return Util.isInt(value) && value >= 0;
    }

    /**
       * Test whether an object is a uint8.
       * @param {Number?} value
       * @returns {Boolean}
       */ }, { key: 'isU8', value: function isU8(
    value) {
      return (value & 0xff) === value; // eslint-disable-line no-bitwise
    }

    /**
       * Test whether an object is a uint16.
       * @param {Number?} value
       * @returns {Boolean}
       */ }, { key: 'isU16', value: function isU16(

    value) {
      return (value & 0xffff) === value; // eslint-disable-line no-bitwise
    }

    /**
       * Test whether an object is a uint32.
       * @param {Number?} value
       * @returns {Boolean}
       */ }, { key: 'isU32', value: function isU32(

    value) {
      return value >>> 0 === value; // eslint-disable-line no-bitwise
    }

    /**
       * Test whether an object is a uint53.
       * @param {Number?} value
       * @returns {Boolean}
       */ }, { key: 'isU64', value: function isU64(

    value) {
      return Util.isUint(value);
    }

    /**
       * Test whether a string is a plain
       * ascii string (no control characters).
       * @param {String} str
       * @returns {Boolean}
       */

    /**
           * Find index of a buffer in an array of buffers.
           * @param {Buffer[]} items
           * @param {Buffer} data - Target buffer to find.
           * @returns {Number} Index (-1 if not found).
           */ }, { key: 'indexOf', value: function indexOf(

    items, data) {
      (0, _assert2.default)(Array.isArray(items));
      (0, _assert2.default)(Buffer.isBuffer(data));

      for (var i = 0; i < items.length; i++) {
        var item = items[i];

        (0, _assert2.default)(Buffer.isBuffer(item));

        if (item.equals(data)) {return i;}
      }

      return -1;
    }

    /**
       * Test to see if a string starts with a prefix.
       * @param {String} str
       * @param {String} prefix
       * @returns {Boolean}
       */ }, { key: 'startsWith', value: function startsWith(

    str, prefix) {
      (0, _assert2.default)(typeof str === 'string');

      if (!str.startsWith) {return str.indexOf(prefix) === 0;}

      return str.startsWith(prefix);
    }

    /**
       * Test whether a string is hex (length must be even).
       * Note that this _could_ await a false positive on
       * base58 strings.
       * @param {String?} str
       * @returns {Boolean}
       */ }, { key: 'isBytes', value: function isBytes(

    str) {
      if (typeof str !== 'string') {return false;}
      var trunk = str.indexOf('0x') === 0 ? str.substring(2, str.length) : str;
      return str.length % 2 === 0 && /^[0-9A-Fa-f]+$/.test(trunk);
    }

    /**
       * Test whether an object is a 256 bit hash (hex string).
       * @param {String?} hash
       * @returns {Boolean}
       */ }, { key: 'isBytes32', value: function isBytes32(

    hash) {
      if (typeof hash !== 'string') {return false;}
      var trunk = hash.indexOf('0x') === 0 ? hash.substring(2, hash.length) : hash;
      return trunk.length === 64 && Util.isBytes(trunk);
    } }, { key: 'writeUint64', value: function writeUint64(

    buff, value) {var offset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var big = ~~(value / 0xFFFFFFFF); // eslint-disable-line no-bitwise
      buff.writeUInt32BE(big, offset);
      var low = value % 0xFFFFFFFF - big;
      buff.writeUInt32BE(low, offset + 4);
    } }, { key: 'readUint64', value: function readUint64(

    buff) {var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      return parseInt(buff.slice(offset, offset + 8).toString('hex'), 16);
    } }, { key: 'arrayToRaw', value: function arrayToRaw(

    arr) {
      // todo: possible performance improvement if totalLength supplied to Buffer.concat
      return Buffer.concat(arr.map(function (v) {return v.toRaw();}));
    } }, { key: 'toHexString', value: function toHexString(

    buffer) {
      return '0x' + buffer.toString('hex');
    } }]);return Util;}();exports.default = Util;module.exports = exports['default'];