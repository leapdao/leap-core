'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Type = undefined;var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);








var _ethereumjsUtil = require('ethereumjs-util');var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);
var _fastEquals = require('fast-equals');

var _input = require('./input');var _input2 = _interopRequireDefault(_input);
var _output = require('./output');var _output2 = _interopRequireDefault(_output);
var _outpoint = require('./outpoint');var _outpoint2 = _interopRequireDefault(_outpoint);
var _util = require('./util');function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };} /**
                                                                                                                             * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
                                                                                                                             *
                                                                                                                             * This source code is licensed under the GNU Affero General Public License,
                                                                                                                             * version 3, found in the LICENSE file in the root directory of this source
                                                                                                                             * tree.
                                                                                                                             */var EMPTY_BUF = Buffer.alloc(32, 0);var Type = exports.Type = { DEPOSIT: 2, TRANSFER: 3,
  ACCOUNT_SIM: 4,
  COMP_REQ: 5,
  COMP_RESP: 6,
  EXIT: 7 };var



Transaction = function () {

  function Transaction(type, inputs, outputs, options) {(0, _classCallCheck3.default)(this, Transaction);
    this.type = type;
    this.inputs = inputs || [];
    this.outputs = outputs || [];
    this.options = options;

    // recover signer if we have signatures without signer
    if (this.inputs.length && this.inputs[0].v && !this.inputs[0].signer) {
      this.recoverTxSigner();
    }
  }(0, _createClass3.default)(Transaction, [{ key: 'getSize',























    /*
                                                              * Returns raw transaction size.
                                                              * See `toRaw` for details.
                                                              */value: function getSize()
    {
      if (this.type === Type.DEPOSIT) {
        return 35;
      }
      if (this.type === Type.TRANSFER) {
        return 10 + this.inputs.reduce(function (s, i) {return s + i.getSize();}, 0) +
        this.outputs.reduce(function (s, o) {return s + o.getSize();}, 0);
      }

      return this.toRaw().length;
    }

    // Recovers signer address for each of the inputs
    // Requires inputs to be signed.
  }, { key: 'recoverTxSigner', value: function recoverTxSigner() {var _this = this;
      this.inputs.map(function (i) {return i.recoverSigner(_this.sigHashBuf());});
    }

    // Returns sigHash as Buffer.
    // Calculated as follows:
    // 1. serialize to bytes
    // 2. strip out input signatures
    // 3. calc sha3
  }, { key: 'sigHashBuf', value: function sigHashBuf()














    {
      return Transaction.sigHashBufStatic(this.type, this.toRaw(), this.inputs.length);
    }

    // Returns sigHash as hex string
  }, { key: 'sigHash', value: function sigHash() {
      return '0x' + this.sigHashBuf().toString('hex');
    }

    // Signs each input with provided private keys
    // @param {Array} privKeys - array of private keys strings.
  }, { key: 'sign', value: function sign(privKeys) {
      if (privKeys.length !== this.inputs.length) {
        throw Error('amount of private keys doesn\'t match amount of inputs');
      }
      for (var i = this.type === Type.TRANSFER ? 0 : 1; i < privKeys.length; i++) {
        var sig = _ethereumjsUtil2.default.ecsign(
        this.sigHashBuf(),
        Buffer.from(privKeys[i].replace('0x', ''), 'hex'));

        this.inputs[i].setSig(
        sig.r, sig.s, sig.v, // sig
        (0, _util.toHexString)(_ethereumjsUtil2.default.privateToAddress(privKeys[i])) // signer
        );
      }
      return this;
    } }, { key: 'signAll', value: function signAll(

    privKey) {
      return this.sign(this.inputs.map(function () {return privKey;}));
    }

    // Returns tx hash as Buffer
  }, { key: 'hashBuf', value: function hashBuf() {
      var raw = this.toRaw();
      if (this.type === Type.TRANSFER && raw.slice(34, 66).equals(EMPTY_BUF)) {
        throw Error('not signed yet');
      }
      return _ethereumjsUtil2.default.sha3(raw);
    }

    // Returns tx hash as hex string
  }, { key: 'hash', value: function hash() {
      return (0, _util.toHexString)(this.hashBuf());
    }

    // Returns serialized tx bytes as hex string
  }, { key: 'hex', value: function hex() {
      return (0, _util.toHexString)(this.toRaw());
    }

    // Checks if this tx is equal to `another`
  }, { key: 'equals', value: function equals(another) {
      return (0, _fastEquals.deepEqual)(this, another);
    }

    /**
      *
      * Serialized this tx in bytes as follows:
      *
      * Coinbase (29 bytes):
      *
      * 0 -   1 byte type
      * 1 -   8 bytes value
      * 9 -  20 bytes address
      * 29
      *
      * Deposit (33 bytes):
      *
      * 0 -   1 byte type
      * 1 -   4 bytes depositId
      * 5 -   8 bytes value
      * 13 -  20 bytes address
      * 33
      *
      * Transfer (262 bytes):
      *
      * 0 -   1 byte type
      * 1 -   8 bytes height
      * 9 -   4 bits number of inputs
      * 9 -   4 bits number of outputs
      * 10 -  32 bytes prev tx          $
      * 42 -  1 byte output pos         $      first input
      * 43 -  32 bytes r-signature        #
      * 75 -  32 bytes s-signature        #    first signature
      * 107 - 1 byte v-signature          #
      * 108 - 32 bytes prev tx          $
      * 140 - 1 byte output pos         $      second input
      * 141 - 32 bytes r-signature        #
      * 173 - 32 bytes s-signature        #    second signature
      * 205 - 1 byte v-signature          #
      * 206 - 8 bytes value             $
      * 214 - 20 bytes address          $      first output
      * 234 - 8 bytes value               #
      * 242 - 20 bytes address            #    second output
      * 262
      *
      * */ }, { key: 'toRaw', value: function toRaw()
    {
      var payload = void 0;
      var inputs = [];
      if (this.type === Type.DEPOSIT) {
        payload = Buffer.alloc(5, 0);
        payload.writeUInt8(this.type, 0);
        payload.writeUInt32BE(this.options.depositId, 1);
      } else if (this.type === Type.EXIT) {
        payload = Buffer.alloc(34, 0);
        payload.writeUInt8(this.type, 0);
        (0, _util.arrayToRaw)(this.inputs).copy(payload, 1, 0, 33);
      } else if (this.type === Type.TRANSFER) {
        payload = Buffer.alloc(10, 0);
        payload.writeUInt8(this.type, 0);
        (0, _util.writeUint64)(payload, this.options.height, 1);
        // write ins and outs length as nibbles
        payload.writeUInt8(16 * this.inputs.length + this.outputs.length, 9);
        inputs = this.inputs;
      } else if (this.type === Type.COMP_REQ || this.type === Type.COMP_RESP) {
        payload = Buffer.alloc(2, 0);
        payload.writeUInt8(this.type, 0);
        this.inputs[0].contractAddr = '0x00';
        // write ins and outs length as nibbles
        payload.writeUInt8(16 * this.inputs.length + this.outputs.length, 1);
        inputs = this.inputs;
      } else {
        payload = Buffer.alloc(1, 0);
        payload.writeUInt8(this.type, 0);
        inputs = this.inputs;
      }
      return Buffer.concat([payload, (0, _util.arrayToRaw)(inputs), (0, _util.arrayToRaw)(this.outputs)]);
    } }, { key: 'toJSON', value: function toJSON()

    {
      var json = {
        type: this.type,
        hash: this.hash(),
        inputs: this.inputs.map(function (inp) {return inp.toJSON();}),
        outputs: this.outputs.map(function (out) {return out.toJSON();}) };


      if (this.options) {
        json.options = this.options;
      }

      return json;
    } }], [{ key: 'deposit', value: function deposit(depositId, value, address, color) {return new Transaction(Type.DEPOSIT, [], [new _output2.default(value, address, color)], { depositId: depositId });} }, { key: 'exit', value: function exit(input) {return new Transaction(Type.EXIT, [input], []);} }, { key: 'transfer', value: function transfer(height, inputs, outputs) {return new Transaction(Type.TRANSFER, inputs, outputs, { height: height });} }, { key: 'compRequest', value: function compRequest(inputs, outputs) {return new Transaction(Type.COMP_REQ, inputs, outputs);} }, { key: 'compResponse', value: function compResponse(inputs, outputs) {return new Transaction(Type.COMP_RESP, inputs, outputs);} }, { key: 'sigHashBufStatic', value: function sigHashBufStatic(type, raw, inputsLength) {var noSigs = Buffer.alloc(raw.length, 0);var offset = type === Type.TRANSFER ? 10 : 2; // copy type, height and lengths
      raw.copy(noSigs, 0, 0, offset);for (var i = 0; i < inputsLength; i += 1) {raw.copy(noSigs, offset, offset, offset + 33);offset += type !== Type.TRANSFER && i === 0 ? 33 : 98;}raw.copy(noSigs, offset, offset, raw.length);return _ethereumjsUtil2.default.sha3(noSigs);} }, { key: 'fromJSON', value: function fromJSON(_ref)
    {var type = _ref.type,inputs = _ref.inputs,outputs = _ref.outputs,options = _ref.options;
      return new Transaction(
      type,
      inputs.map(_input2.default.fromJSON),
      outputs.map(_output2.default.fromJSON),
      options);

    } }, { key: 'parseToParams', value: function parseToParams(

    transaction) {
      var bufs = this.parseToBuf(transaction);
      return bufs.parts.map(function (buf) {return '0x' + buf.toString('hex');});
    }

    // Constructs Transaction from given raw bytes
    // @returns {Transaction}
  }, { key: 'fromRaw', value: function fromRaw(transaction) {
      var dataBuf = transaction;
      if (!Buffer.isBuffer(transaction)) {
        var dataHex = transaction.replace('0x', '');
        dataBuf = Buffer.alloc(dataHex.length / 2);
        dataBuf.write(dataHex, 'hex');
      }

      var type = dataBuf.readUInt8(0);

      switch (type) {
        case Type.DEPOSIT:{
            if (dataBuf.length !== 35) {
              throw new Error('malformed deposit tx.');
            }
            var depositId = dataBuf.readUInt32BE(1);
            var output = _output2.default.fromRaw(dataBuf.slice(5));
            return new Transaction(Type.DEPOSIT, [], [output], { depositId: depositId });
          }
        case Type.EXIT:{
            if (dataBuf.length !== 34) {
              throw new Error('malformed exit tx.');
            }
            var outpoint = _outpoint2.default.fromRaw(dataBuf, 1);
            return new Transaction(Type.EXIT, [new _input2.default(outpoint)], []);
          }
        case Type.TRANSFER:{
            var height = (0, _util.readUint64)(dataBuf, 1);
            var insOuts = dataBuf.readUInt8(9);
            var insLength = insOuts >> 4; // eslint-disable-line no-bitwise
            var outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
            var ins = [];
            var sigHashBuf = Transaction.sigHashBufStatic(type, dataBuf, insLength);
            for (var i = 0; i < insLength; i += 1) {
              ins.push(_input2.default.fromRaw(dataBuf, 10 + i * _input.SPEND_INPUT_LENGTH, sigHashBuf));
            }
            var outs = [];
            for (var _i = 0; _i < outsLength; _i += 1) {
              outs.push(_output2.default.fromRaw(
              dataBuf,
              10 + insLength * _input.SPEND_INPUT_LENGTH + _i * _output.OUT_LENGTH));

            }
            return new Transaction(Type.TRANSFER, ins, outs, { height: height });
          }
        case Type.COMP_REQ:{
            var _insOuts = dataBuf.readUInt8(1);
            var _insLength = _insOuts >> 4; // eslint-disable-line no-bitwise
            var _outsLength = _insOuts & 0xF; // eslint-disable-line no-bitwise
            var _ins = [];
            _ins.push(_input2.default.fromRaw(dataBuf, 2));
            var _sigHashBuf = Transaction.sigHashBufStatic(type, dataBuf, _insLength);
            // computation input size:
            // tx-type 1b, input# output# 1b, outpoint 33b
            var offset = 35;
            for (var _i2 = 1; _i2 < _insLength; _i2 += 1) {
              _ins.push(_input2.default.fromRaw(dataBuf, offset, _sigHashBuf));
              offset += _input.SPEND_INPUT_LENGTH;
            }
            var _outs = [];
            _outs.push(_output2.default.fromRaw(dataBuf, offset, 1));
            // computation output size:
            // value 8 + color 2 + gasPrice 4 + length 2 + length
            offset += 16 + _outs[0].msgData.length;
            for (var _i3 = 1; _i3 < _outsLength; _i3 += 1) {
              _outs.push(_output2.default.fromRaw(dataBuf, offset));
              offset += _output.OUT_LENGTH;
            }
            return new Transaction(Type.COMP_REQ, _ins, _outs);
          }
        case Type.COMP_RESP:{
            var _insOuts2 = dataBuf.readUInt8(1);
            var _outsLength2 = _insOuts2 & 0xF; // eslint-disable-line no-bitwise
            var _ins2 = [];
            _ins2.push(_input2.default.fromRaw(dataBuf, 2));
            var _outs2 = [];
            _outs2.push(_output2.default.fromRaw(dataBuf, 35, 2));
            for (var _i4 = 1; _i4 < _outsLength2; _i4 += 1) {
              _outs2.push(_output2.default.fromRaw(dataBuf, 95 + (_i4 - 1) * _output.OUT_LENGTH));
            }
            return new Transaction(Type.COMP_RESP, _ins2, _outs2);
          }
        default:{
            throw new Error('unknown transaction type: ' + type + '.');
          }}

    } }]);return Transaction;}();exports.default = Transaction;