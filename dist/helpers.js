'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.



extendWeb3 = extendWeb3;exports.





















calcInputs = calcInputs;exports.



















calcOutputs = calcOutputs;var _outpoint = require('./outpoint');var _outpoint2 = _interopRequireDefault(_outpoint);var _input = require('./input');var _input2 = _interopRequireDefault(_input);var _output = require('./output');var _output2 = _interopRequireDefault(_output);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function extendWeb3(web3Instance) {// `_extend` for web3 0.2x.x, `extend` for 1.x
  var extend = web3Instance._extend || web3Instance.extend; // eslint-disable-line no-underscore-dangle, max-len
  extend({ methods: [new extend.Method({ name: 'getUnspent', call: 'parsec_unspent', params: 1, inputFormatters: [extend.formatters.inputAddressFormatter], outputFormatter: function outputFormatter(unspent) {return { output: unspent.output, outpoint: _outpoint2.default.fromRaw(unspent.outpoint) };} })] });return web3Instance;}function calcInputs(unspent, amount) {if (unspent.length === 0) {throw new Error('Unspent is empty');}var inputs = [];var sum = 0;for (var i = 0; i < unspent.length; i += 1) {inputs.push(new _input2.default(unspent[i].outpoint));sum += unspent[i].output.value;if (sum >= amount) {break;}}return inputs;} // ToDo: handle inputs from different accounts
function calcOutputs(unspent, inputs, from, to, amount) {if (unspent.length === 0) {throw new Error('Unspent is empty');}

  var inInputs = function inInputs(u) {return inputs.findIndex(function (input) {return u.outpoint.equals(input.prevout);}) > -1;};
  var sum = unspent.filter(inInputs).reduce(function (a, u) {return a + u.output.value;}, 0);

  if (sum < amount) {
    throw new Error('Not enought inputs');
  }

  var outputs = [new _output2.default(amount, to.toLowerCase())];
  if (sum > amount) {
    outputs.push(new _output2.default(sum - amount, from.toLowerCase()));
  }

  return outputs;
}