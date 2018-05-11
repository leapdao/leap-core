'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}var Util = function () {function Util() {(0, _classCallCheck3.default)(this, Util);}(0, _createClass3.default)(Util, null, [{ key: 'isUint',

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
      return (value & 0xff) === value;
    }

    /**
       * Test whether an object is a uint16.
       * @param {Number?} value
       * @returns {Boolean}
       */ }, { key: 'isU16', value: function isU16(

    value) {
      return (value & 0xffff) === value;
    }

    /**
       * Test whether an object is a uint32.
       * @param {Number?} value
       * @returns {Boolean}
       */ }, { key: 'isU32', value: function isU32(

    value) {
      return value >>> 0 === value;
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
      assert(Array.isArray(items));
      assert(Buffer.isBuffer(data));

      for (var i = 0; i < items.length; i++) {
        var item = items[i];

        assert(Buffer.isBuffer(item));

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
      assert(typeof str === 'string');

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
    } }]);return Util;}();exports.default = Util;module.exports = exports['default'];