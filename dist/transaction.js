'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);








var _ethereumjsUtil = require('ethereumjs-util');var _ethereumjsUtil2 = _interopRequireDefault(_ethereumjsUtil);
var _fastEquals = require('fast-equals');

var _input = require('./input');var _input2 = _interopRequireDefault(_input);
var _output = require('./output');var _output2 = _interopRequireDefault(_output);
var _outpoint = require('./outpoint');var _outpoint2 = _interopRequireDefault(_outpoint);
var _util = require('./util');
var _type = require('./type');var _type2 = _interopRequireDefault(_type);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var EMPTY_BUF = Buffer.alloc(32, 0); /**
                                      * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
                                      *
                                      * This source code is licensed under the GNU Affero General Public License,
                                      * version 3, found in the LICENSE file in the root directory of this source
                                      * tree.
                                      */var Transaction = function () {function Transaction(type) {var inputs = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];var outputs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];var options = arguments[3];(0, _classCallCheck3.default)(this, Transaction);this.type = type;
    this.inputs = inputs;
    this.outputs = outputs;
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
      if (this.type === _type2.default.DEPOSIT) {
        return 36;
      }

      if (this.type === _type2.default.TRANSFER) {
        return 2 + this.inputs.reduce(function (s, i) {return s + i.getSize();}, 0) +
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
      if (this.type === _type2.default.CONSOLIDATE) {
        // no signatures needed
        return this;
      }
      var startIdx = this.type === _type2.default.TRANSFER ? 0 : 1;
      for (var i = startIdx; i < privKeys.length; i++) {
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
      if (this.type === _type2.default.TRANSFER && raw.slice(34, 66).equals(EMPTY_BUF)) {
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
      *
      * Deposit (36 bytes):
      *
      * 0 -   1 byte type
      * 1 -   1 byte inputs and outputs
      * 2 -   4 bytes depositId
      * 6 -   8 bytes value
      * 14 -  2 bytes color
      * 16 - 20 bytes address
      * 36
      *
      * Transfer (262 bytes):
      *
      * 0 -   1 byte type
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
      * 214 - 2 bytes color
      * 216 - 20 bytes address          $      first output
      * 236 - 8 bytes value               #
      * 244 - 2 bytes color
      * 246 - 20 bytes address            #    second output
      * 266
      *
      * Consolidate (167 bytes):
      *
      * 0   -  1 byte type
      * 1   -  1 byte number of inputs
      * 2   - 32 bytes prev tx          #
      * 34  -  1 byte output pos        # first input
      * 35  - 32 bytes r-signature      #
      * 67  - 32 bytes s-signature      # first signature
      * 99  -  1 byte v-signature       #
      * 100 - 32 bytes prev tx          #
      * 132 -  1 byte output pos        # second input
      * 133 - 32 bytes r-signature      #
      * 165 - 32 bytes s-signature      # second signature
      * 166 -  1 byte v-signature       #
      * 167
      *
      * */ }, { key: 'toRaw', value: function toRaw()
    {
      var payload = void 0;
      var inputs = [];
      if (this.type === _type2.default.DEPOSIT) {
        payload = Buffer.alloc(6, 0);
        payload.writeUInt8(this.type, 0);
        payload.writeUInt8(16 + 1, 1); // 1 inputs, 1 output
        payload.writeUInt32BE(this.options.depositId, 2);
      } else if (this.type === _type2.default.VALIDATOR_JOIN || this.type === _type2.default.VALIDATOR_LEAVE) {
        payload = Buffer.alloc(40, 0);
        payload.writeUInt8(this.type, 0);
        payload.writeUInt8(0, 1); // 0 inputs, 0 output
        payload.writeUInt16BE(this.options.slotId, 2);
        payload.write(this.options.tenderKey.replace('0x', ''), 4, 'hex');
        payload.writeUInt32BE(this.options.eventsCount, 36);
      } else if (this.type === _type2.default.VALIDATOR_LOGOUT) {
        payload = Buffer.alloc(44, 0);
        payload.writeUInt8(this.type, 0);
        payload.writeUInt8(0, 1); // 0 inputs, 0 output
        payload.writeUInt16BE(this.options.slotId, 2);
        payload.write(this.options.tenderKey.replace('0x', ''), 4, 'hex');
        payload.writeUInt32BE(this.options.eventsCount, 36);
        payload.writeUInt32BE(this.options.activationEpoch, 40);
      } else if (this.type === _type2.default.EXIT) {
        payload = Buffer.alloc(34, 0);
        payload.writeUInt8(this.type, 0);
        (0, _util.arrayToRaw)(this.inputs).copy(payload, 1, 0, 33);
      } else if (this.type === _type2.default.TRANSFER) {
        payload = Buffer.alloc(2, 0);
        payload.writeUInt8(this.type, 0);
        // write ins and outs length as nibbles
        payload.writeUInt8(16 * this.inputs.length + this.outputs.length, 1);
        inputs = this.inputs;
      } else if (this.type === _type2.default.CONSOLIDATE) {
        payload = Buffer.alloc(2, 0);
        payload.writeUInt8(this.type, 0);
        // always one output, no need to read second nibble
        payload.writeUInt8(16 * this.inputs.length + 1, 1);
        inputs = this.inputs;
      } else if (this.type === _type2.default.COMP_REQ || this.type === _type2.default.COMP_RESP) {
        payload = Buffer.alloc(2, 0);
        payload.writeUInt8(this.type, 0);
        this.inputs[0].type = this.type;
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
    } }], [{ key: 'validatorJoin', value: function validatorJoin(slotId, tenderKey, eventsCount) {return new Transaction(_type2.default.VALIDATOR_JOIN, [], [], { slotId: slotId, eventsCount: eventsCount, tenderKey: tenderKey.toLowerCase() });} }, { key: 'validatorLogout', value: function validatorLogout(slotId, tenderKey, eventsCount, activationEpoch) {return new Transaction(_type2.default.VALIDATOR_LOGOUT, [], [], { slotId: slotId, eventsCount: eventsCount, tenderKey: tenderKey.toLowerCase(), activationEpoch: activationEpoch });} }, { key: 'validatorLeave', value: function validatorLeave(slotId, tenderKey, eventsCount) {return new Transaction(_type2.default.VALIDATOR_LEAVE, [], [], { slotId: slotId, eventsCount: eventsCount, tenderKey: tenderKey.toLowerCase() });} }, { key: 'deposit', value: function deposit(depositId, value, address, color) {return new Transaction(_type2.default.DEPOSIT, [], [new _output2.default(value, address, color)], { depositId: depositId });} }, { key: 'exit', value: function exit(input) {return new Transaction(_type2.default.EXIT, [input]);} }, { key: 'transfer', value: function transfer(inputs, outputs) {return new Transaction(_type2.default.TRANSFER, inputs, outputs);} }, { key: 'consolidate', value: function consolidate(inputs, output) {inputs.forEach(function (input) {input.type = _type2.default.CONSOLIDATE; // eslint-disable-line
      });return new Transaction(_type2.default.CONSOLIDATE, inputs, [output]);} }, { key: 'compRequest', value: function compRequest(inputs, outputs) {inputs[0].type = _type2.default.COMP_REQ; // eslint-disable-line no-param-reassign
      return new Transaction(_type2.default.COMP_REQ, inputs, outputs);} }, { key: 'compResponse', value: function compResponse(inputs, outputs) {inputs[0].type = _type2.default.COMP_RESP; // eslint-disable-line no-param-reassign
      return new Transaction(_type2.default.COMP_RESP, inputs, outputs);} }, { key: 'sigHashBufStatic', value: function sigHashBufStatic(type, raw, inputsLength) {var noSigs = Buffer.alloc(raw.length, 0);var offset = 2; // copy type, height and lengths
      raw.copy(noSigs, 0, 0, offset);for (var i = 0; i < inputsLength; i += 1) {raw.copy(noSigs, offset, offset, offset + 33);offset += type !== _type2.default.TRANSFER && type !== _type2.default.CONSOLIDATE && i === 0 ? 33 : 98;}raw.copy(noSigs, offset, offset, raw.length);return _ethereumjsUtil2.default.sha3(noSigs);} }, { key: 'fromJSON', value: function fromJSON(_ref) {var type = _ref.type,inputs = _ref.inputs,outputs = _ref.outputs,options = _ref.options;return new Transaction(type,
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
        case _type2.default.DEPOSIT:{
            if (dataBuf.length !== 36) {
              throw new Error('malformed deposit tx.');
            }
            var depositId = dataBuf.readUInt32BE(2);
            var output = _output2.default.fromRaw(dataBuf.slice(6));
            return new Transaction(_type2.default.DEPOSIT, [], [output], { depositId: depositId });
          }
        case _type2.default.VALIDATOR_JOIN:
        case _type2.default.VALIDATOR_LEAVE:{
            var txFunction = type === _type2.default.VALIDATOR_JOIN ? 'validatorJoin' : 'validatorLeave';
            if (dataBuf.length !== 40) {
              throw new Error('malformed ' + txFunction + ' tx.');
            }
            var slotId = dataBuf.readUInt16BE(2);
            var tenderKey = '0x' + dataBuf.slice(4, 36).toString('hex');
            var eventsCount = dataBuf.readUInt32BE(36);
            return Transaction[txFunction](slotId, tenderKey, eventsCount);
          }
        case _type2.default.VALIDATOR_LOGOUT:{
            if (dataBuf.length !== 44) {
              throw new Error('malformed validatorLogout tx.');
            }
            var _slotId = dataBuf.readUInt16BE(2);
            var _tenderKey = '0x' + dataBuf.slice(4, 36).toString('hex');
            var _eventsCount = dataBuf.readUInt32BE(36);
            var activationEpoch = dataBuf.readUInt32BE(40);
            return Transaction.validatorLogout(_slotId, _tenderKey, _eventsCount, activationEpoch);
          }
        case _type2.default.EXIT:{
            if (dataBuf.length !== 34) {
              throw new Error('malformed exit tx.');
            }
            var outpoint = _outpoint2.default.fromRaw(dataBuf, 1);
            return new Transaction(_type2.default.EXIT, [new _input2.default(outpoint)], []);
          }
        case _type2.default.TRANSFER:{
            var insOuts = dataBuf.readUInt8(1);
            var insLength = insOuts >> 4; // eslint-disable-line no-bitwise
            var outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
            var ins = [];
            var sigHashBuf = Transaction.sigHashBufStatic(type, dataBuf, insLength);
            for (var i = 0; i < insLength; i += 1) {
              ins.push(_input2.default.fromRaw(dataBuf, 2 + i * _input.SPEND_INPUT_LENGTH, sigHashBuf));
            }
            var outs = [];
            for (var _i = 0; _i < outsLength; _i += 1) {
              outs.push(_output2.default.fromRaw(
              dataBuf,
              2 + insLength * _input.SPEND_INPUT_LENGTH + _i * _output.OUT_LENGTH));

            }
            return new Transaction(_type2.default.TRANSFER, ins, outs);
          }
        case _type2.default.CONSOLIDATE:{
            var _insOuts = dataBuf.readUInt8(1);
            var _insLength = _insOuts >> 4; // eslint-disable-line no-bitwise
            var _ins = [];
            var unsignedInputLength = 33;
            for (var _i2 = 0; _i2 < _insLength; _i2 += 1) {
              _ins.push(_input2.default.fromRaw(dataBuf, 2 + _i2 * unsignedInputLength, _type2.default.CONSOLIDATE));
            }
            var _outs = [];
            _outs.push(_output2.default.fromRaw(dataBuf, 2 + _insLength * unsignedInputLength));
            return new Transaction(_type2.default.CONSOLIDATE, _ins, _outs);
          }
        case _type2.default.COMP_REQ:{
            var _insOuts2 = dataBuf.readUInt8(1);
            var _insLength2 = _insOuts2 >> 4; // eslint-disable-line no-bitwise
            var _outsLength = _insOuts2 & 0xF; // eslint-disable-line no-bitwise
            var _ins2 = [];
            _ins2.push(_input2.default.fromRaw(dataBuf, 2, _type2.default.COMP_REQ));
            var _sigHashBuf = Transaction.sigHashBufStatic(type, dataBuf, _insLength2);
            // computation input size:
            // tx-type 1b, input# output# 1b, outpoint 33b
            var offset = 35;
            for (var _i3 = 1; _i3 < _insLength2; _i3 += 1) {
              _ins2.push(_input2.default.fromRaw(dataBuf, offset, _sigHashBuf));
              offset += _input.SPEND_INPUT_LENGTH;
            }
            var _outs2 = [];
            _outs2.push(_output2.default.fromRaw(dataBuf, offset, 1));
            // computation output size:
            // value 8 + color 2 + address 20 + gasPrice 4 + length 2 + length
            offset += 36 + _outs2[0].msgData.length;
            for (var _i4 = 1; _i4 < _outsLength; _i4 += 1) {
              _outs2.push(_output2.default.fromRaw(dataBuf, offset));
              offset += _output.OUT_LENGTH;
            }
            return new Transaction(_type2.default.COMP_REQ, _ins2, _outs2);
          }
        case _type2.default.COMP_RESP:{
            var _insOuts3 = dataBuf.readUInt8(1);
            var _outsLength2 = _insOuts3 & 0xF; // eslint-disable-line no-bitwise
            var _ins3 = [];
            _ins3.push(_input2.default.fromRaw(dataBuf, 2, _type2.default.COMP_RESP));
            var _outs3 = [];
            _outs3.push(_output2.default.fromRaw(dataBuf, 35, 2));
            for (var _i5 = 1; _i5 < _outsLength2; _i5 += 1) {
              _outs3.push(_output2.default.fromRaw(dataBuf, 95 + (_i5 - 1) * _output.OUT_LENGTH));
            }
            return new Transaction(_type2.default.COMP_RESP, _ins3, _outs3);
          }
        default:{
            throw new Error('unknown transaction type: ' + type + '.');
          }}

    } }]);return Transaction;}();exports.default = Transaction;module.exports = exports['default'];