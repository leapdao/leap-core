'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.Type = undefined;var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _signer = require('./signer');var _signer2 = _interopRequireDefault(_signer);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

var EMPTY = '0x0000000000000000000000000000000000000000000000000000000000000000';
var MAX_UINT32 = 0xFFFFFFFF;
var IN_LENGTH = 33 + 65;
var OUT_LENGTH = 28;

var Type = exports.Type = {
  COINBASE: 1,
  DEPOSIT: 2,
  TRANSFER: 3,
  ACCOUNT_SIM: 4,
  COMP_REQ: 5,
  COMP_RESP: 6 };var



Transaction = function () {
  function Transaction(height) {(0, _classCallCheck3.default)(this, Transaction);
    this.height = height;
  }(0, _createClass3.default)(Transaction, [{ key: 'coinbase', value: function coinbase()

    {for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {args[_key] = arguments[_key];} // eslint-disable-line class-methods-use-this
      var value = args[0],addr = args[1];
      var payload = Buffer.alloc(29, 0);
      // <1 bytes type>
      payload.writeUInt8(Type.COINBASE, 0);
      // value
      var big = ~~(value / MAX_UINT32); // eslint-disable-line no-bitwise
      payload.writeUInt32BE(big, 1);
      var low = value % MAX_UINT32 - big;
      payload.writeUInt32BE(low, 5);
      // <20 bytes addr>
      payload.write(addr.replace('0x', ''), 9, 'hex');
      return new _signer2.default(args, payload, Type.COINBASE);
    } }, { key: 'deposit', value: function deposit()

    {for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {args[_key2] = arguments[_key2];} // eslint-disable-line class-methods-use-this
      var depositId = args[0],value = args[1],addr = args[2];
      var payload = Buffer.alloc(33, 0);
      // <1 bytes type>
      payload.writeUInt8(Type.DEPOSIT, 0);
      // depositId
      payload.writeUInt32BE(depositId, 1);
      // value
      var big = ~~(value / MAX_UINT32); // eslint-disable-line no-bitwise
      payload.writeUInt32BE(big, 5);
      var low = value % MAX_UINT32 - big;
      payload.writeUInt32BE(low, 9);
      // <20 bytes addr>
      payload.write(addr.replace('0x', ''), 13, 'hex');
      return new _signer2.default(args, payload, Type.DEPOSIT);
    } }, { key: 'transfer', value: function transfer()

    {for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {args[_key3] = arguments[_key3];}var
      ins = args[0],outs = args[1];
      if (ins.length === 0 || ins.length > 2) {
        throw Error('only 1 or 2 ins allowed');
      }
      if (outs.length === 0 || outs.length > 2) {
        throw Error('only 1 or 2 outs allowed');
      }
      var payload = Buffer.alloc(10 + ins.length * IN_LENGTH + outs.length * OUT_LENGTH, 0);
      // <1 bytes type>
      payload.writeUInt8(Type.TRANSFER, 0);
      // height
      var big = ~~(this.height / MAX_UINT32); // eslint-disable-line no-bitwise
      payload.writeUInt32BE(big, 1);
      var low = this.height % MAX_UINT32 - big;
      payload.writeUInt32BE(low, 5);
      // wirte ins and outs length as nibbles
      payload.writeUInt8(16 * ins.length + outs.length, 9);
      // build inputs
      for (var i = 0; i < ins.length; i += 1) {
        payload.write(ins[i].prevTx.replace('0x', ''), 10 + i * IN_LENGTH, 'hex');
        payload.writeUInt8(ins[i].outPos, 42 + i * IN_LENGTH);
      }
      // build outputs
      for (var _i = 0; _i < outs.length; _i += 1) {
        big = ~~(outs[_i].value / MAX_UINT32); // eslint-disable-line no-bitwise
        payload.writeUInt32BE(big, 10 + ins.length * IN_LENGTH + _i * OUT_LENGTH, 'hex');
        low = outs[_i].value % MAX_UINT32 - big;
        payload.writeUInt32BE(low, 14 + ins.length * IN_LENGTH + _i * OUT_LENGTH, 'hex');
        payload.write(outs[_i].addr.replace('0x', ''), 18 + ins.length * IN_LENGTH + _i * OUT_LENGTH, 'hex');
      }
      return new _signer2.default(args, payload, Type.TRANSFER, this.height);
    } }], [{ key: 'parseToParams', value: function parseToParams(


    transaction) {
      var bufs = this.parseToBuf(transaction);
      if (bufs.type === Type.SETTLE) {
        var v = bufs.parts[2].readUInt8(0);
        bufs.parts[2].writeUInt8(0, 0);
        return ['0x' + v.toString(16) + bufs.parts[0].toString('hex') + bufs.parts[1].toString('hex'), '0x' + bufs.parts[2].toString('hex'), '0x' + bufs.parts[3].toString('hex')];
      }
      return bufs.parts.map(function (buf) {return '0x' + buf.toString('hex');});
    } }, { key: 'parse', value: function parse(

    transaction) {
      var dataHex = transaction.replace('0x', '');
      var dataBuf = Buffer.alloc(dataHex.length / 2);
      dataBuf.write(dataHex, 'hex');

      var type = dataBuf.readUInt8(0);

      switch (type) {
        case Type.COINBASE:{
            if (dataBuf.length !== 29) {
              throw new Error('malformed coinbase tx.');
            }
            var value = parseInt(dataBuf.slice(1, 9).toString('hex'), 16);
            var addr = '0x' + dataBuf.slice(9, 29).toString('hex');
            var coinbase = new Transaction().coinbase(value, addr);
            return coinbase.toJSON();
          }
        case Type.DEPOSIT:{
            if (dataBuf.length !== 33) {
              throw new Error('malformed deposit tx.');
            }
            var depositId = dataBuf.readUInt32BE(1);
            var _value = parseInt(dataBuf.slice(5, 13).toString('hex'), 16);
            var _addr = '0x' + dataBuf.slice(13, 33).toString('hex');
            var deposit = new Transaction().deposit(depositId, _value, _addr);
            return deposit.toJSON();
          }
        case Type.TRANSFER:{
            var height = parseInt(dataBuf.slice(1, 9).toString('hex'), 16);
            var insOuts = dataBuf.readUInt8(9);
            var insLength = insOuts >> 4; // eslint-disable-line no-bitwise
            var outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
            var ins = [];
            for (var i = 0; i < insLength; i += 1) {
              var input = {
                prevTx: '0x' + dataBuf.slice(10 + i * IN_LENGTH, 42 + i * IN_LENGTH).toString('hex'),
                outPos: dataBuf.readUInt8(42 + i * IN_LENGTH) };

              var r = '0x' + dataBuf.slice(43 + i * IN_LENGTH, 75 + i * IN_LENGTH).toString('hex');
              if (r !== EMPTY) {
                input.r = r;
                input.s = '0x' + dataBuf.slice(75 + i * IN_LENGTH, 107 + i * IN_LENGTH).toString('hex');
                input.v = dataBuf.readUInt8(107 + i * IN_LENGTH);
              }
              ins.push(input);
            }
            var outs = [];
            for (var _i2 = 0; _i2 < outsLength; _i2 += 1) {
              var outPos = 10 + insLength * IN_LENGTH + _i2 * OUT_LENGTH;
              outs.push({
                value: parseInt(dataBuf.slice(outPos, outPos + 8).toString('hex'), 16),
                addr: '0x' + dataBuf.slice(outPos + 8, outPos + 28).toString('hex') });

            }
            var transfer = new Transaction(height).transfer(ins, outs);
            return transfer.toJSON();
          }
        default:{
            throw new Error('unknown transaction type: ' + type + '.');
          }}

      return null;
    } }]);return Transaction;}();exports.default = Transaction;