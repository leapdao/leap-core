'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.SPEND_INPUT_LENGTH = undefined;var _extends2 = require('babel-runtime/helpers/extends');var _extends3 = _interopRequireDefault(_extends2);var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);








var _assert = require('assert');var _assert2 = _interopRequireDefault(_assert);
var _ethereumjsUtil = require('ethereumjs-util');var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);
var _outpoint = require('./outpoint');var _outpoint2 = _interopRequireDefault(_outpoint);
var _util = require('./util');var _util2 = _interopRequireDefault(_util);
var _type = require('./type');var _type2 = _interopRequireDefault(_type);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

// outpoint(32 bytes prev tx + 1 byte output pos) + 65 bytes signature
var SPEND_INPUT_LENGTH = exports.SPEND_INPUT_LENGTH = 33 + 65; /**
                                                                * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
                                                                *
                                                                * This source code is licensed under the GNU Affero General Public License,
                                                                * version 3, found in the LICENSE file in the root directory of this source
                                                                * tree.
                                                                */var Input = function () {function Input(options) {(0, _classCallCheck3.default)(this, Input);if (_outpoint2.default.isOutpoint(options)) {this.prevout = options;} else if (_util2.default.isU32(options)) {
      this.depositId = options;
    } else if (options && options.prevout) {
      this.type = options.type;
      this.prevout = options.prevout;
    }
  }(0, _createClass3.default)(Input, [{ key: 'setSigner', value: function setSigner(

    signer) {
      this.signer = signer;
    } }, { key: 'isComputation', value: function isComputation()

    {
      return this.type === _type2.default.COMP_REQ || this.type === _type2.default.COMP_RESP;
    } }, { key: 'isConsolidation', value: function isConsolidation()

    {
      return this.type === _type2.default.CONSOLIDATE;
    } }, { key: 'isDeposit', value: function isDeposit()

    {
      return this.depositId;
    } }, { key: 'isSpend', value: function isSpend()

    {
      return this.prevout;
    }

    /**
       * Calculate size of input.
       * @returns {Number}
       */ }, { key: 'getSize', value: function getSize()

    {
      if (this.isDeposit()) {
        return 4;
      }
      if (this.isComputation() || this.isConsolidation()) {
        return 33;
      }
      if (this.isSpend()) {
        return SPEND_INPUT_LENGTH;
      }
      return 0;
    } }, { key: 'setSig', value: function setSig(

    r, s, v, signer) {
      (0, _assert2.default)(this.isSpend(), 'Can only set signature on outpoint');
      (0, _assert2.default)(Buffer.isBuffer(r), 'r has to be buffer');
      (0, _assert2.default)(r.length === 32, 'r length must be 32 bytes.');
      this.r = r;
      (0, _assert2.default)(Buffer.isBuffer(s), 's has to be buffer');
      (0, _assert2.default)(s.length === 32, 's length must be 32 bytes.');
      this.s = s;
      (0, _assert2.default)(_util2.default.isU8(v), 'v must be a uint8.');
      this.v = v;
      if (signer) {
        (0, _assert2.default)(typeof signer === 'string', 'signer must be a string');
        this.signer = signer;
      }
    } }, { key: 'recoverSigner', value: function recoverSigner(

    sigHashBuf) {
      (0, _assert2.default)(this.v, 'Input should be signed');
      (0, _assert2.default)(sigHashBuf, 'sigHashBuf is required');
      this.signer = Input.recoverSignerAddress(sigHashBuf, this.v, this.r, this.s);
    } }, { key: 'toJSON', value: function toJSON()

    {
      if (this.isDeposit()) {
        return {
          depositId: this.depositId };

      }
      if (this.isComputation() || this.isConsolidation()) {
        var input = (0, _extends3.default)({}, this.prevout); // toJSON shouldn't mutate existing objects
        input.hash = _ethereumjsUtil2.default.bufferToHex(input.hash);
        return input;
      }
      if (this.isSpend()) {
        var _input = (0, _extends3.default)({}, this.prevout); // toJSON shouldn't mutate existing objects
        _input.hash = _ethereumjsUtil2.default.bufferToHex(_input.hash);
        if (this.signer) {
          _input.r = _ethereumjsUtil2.default.bufferToHex(this.r);
          _input.s = _ethereumjsUtil2.default.bufferToHex(this.s);
          _input.v = this.v;
          _input.signer = this.signer;
        }
        return _input;
      }
      return {};
    }

    /**
       * Instantiate input from json object.
       * @param {Object} json
       * @returns {Input}
       */ }, { key: 'toRaw', value: function toRaw()























    {
      var dataBuf = Buffer.alloc(this.getSize());
      if (this.isDeposit()) {
        dataBuf.writeUInt32BE(this.depositId);
      } else if (this.isComputation()) {
        this.prevout.toRaw(dataBuf, 0);
      } else if (this.isSpend()) {
        this.prevout.toRaw(dataBuf, 0);
        if (this.signer) {
          this.r.copy(dataBuf, 33);
          this.s.copy(dataBuf, 65);
          dataBuf.writeInt8(this.v, 97);
        }
      }
      return dataBuf;
    }

    /**
       * Instantiate input from serialized data.
       * @param {Buffer} data
       * @returns {Input}
       */ }], [{ key: 'fromJSON', value: function fromJSON(json) {(0, _assert2.default)(json, 'Input data is required.');if (json.depositId) {return new Input(json.depositId);}if (json.hash) {var input = new Input(_outpoint2.default.fromJSON(json));if (json.signer) {input.setSig(_ethereumjsUtil2.default.toBuffer(json.r), _ethereumjsUtil2.default.toBuffer(json.s), json.v, json.signer);}if (json.contractAddr) {input.contractAddr = json.contractAddr;}return input;}return null;} }, { key: 'fromRaw', value: function fromRaw(
    buf, offset, sigHashBuf) {
      var off = offset || 0;
      var prevout = new _outpoint2.default(buf.slice(0 + off, 32 + off), buf.readUInt8(32 + off));
      var input = void 0;
      if (sigHashBuf === _type2.default.CONSOLIDATE ||
      sigHashBuf === _type2.default.COMP_RESP || sigHashBuf === _type2.default.COMP_REQ) {
        // nothing
        input = new Input({ prevout: prevout, type: sigHashBuf });
      } else if (sigHashBuf) {
        input = new Input(prevout);
        var r = buf.slice(33 + off, 65 + off);
        var s = buf.slice(65 + off, 97 + off);
        var v = buf.readUInt8(97 + off);
        var signer = Input.recoverSignerAddress(sigHashBuf, v, r, s);
        input.setSig(r, s, v, signer);
      }
      return input;
    }


    // Utils
  }, { key: 'recoverSignerAddress', value: function recoverSignerAddress(
    sigHashBuf, v, r, s) {
      var pubKey = _ethereumjsUtil2.default.ecrecover(sigHashBuf, v, r, s);
      var addrBuf = _ethereumjsUtil2.default.pubToAddress(pubKey);
      return _ethereumjsUtil2.default.bufferToHex(addrBuf);
    } }]);return Input;}();exports.default = Input;