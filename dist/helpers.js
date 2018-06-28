'use strict';Object.defineProperty(exports, "__esModule", { value: true });exports.




extendWeb3 = extendWeb3;exports.























makeTransferTxFromUnspent = makeTransferTxFromUnspent;var _outpoint = require('./outpoint');var _outpoint2 = _interopRequireDefault(_outpoint);var _input = require('./input');var _input2 = _interopRequireDefault(_input);var _output = require('./output');var _output2 = _interopRequireDefault(_output);var _transaction = require('./transaction');var _transaction2 = _interopRequireDefault(_transaction);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}function extendWeb3(web3Instance) {// `_extend` for web3 0.2x.x, `extend` for 1.x
  var extend = web3Instance._extend || web3Instance.extend; // eslint-disable-line no-underscore-dangle, max-len
  extend({ methods: [new extend.Method({ name: 'getUnspent', call: 'parsec_unspent', params: 1, inputFormatters: [extend.formatters.inputAddressFormatter], outputFormatter: function outputFormatter(unspent) {return { output: unspent.output, outpoint: _outpoint2.default.fromRaw(unspent.outpoint) };} })] });return web3Instance;} // ToDo: simplify it, helper shouldn't care about signing tx or setting height
// main purpose — build inputs and outputs
function makeTransferTxFromUnspent(unspent, from, to, amount,
privKey)

{var height = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
  var fromAddr = from.toLowerCase(); // eslint-disable-line
  to = to.toLowerCase(); // eslint-disable-line

  if (unspent.length === 0) {
    throw new Error('Unspent is empty');
  }

  var inputs = [];
  var outputs = [new _output2.default(amount, to)];
  var sum = 0;
  for (var i = 0; i < unspent.length; i += 1) {
    inputs.push(new _input2.default(unspent[i].outpoint));
    sum += unspent[i].output.value;

    if (sum >= amount) {
      break;
    }
  }

  if (inputs.length === 0) {
    throw new Error('No inputs');
  }

  if (sum > amount) {
    outputs.push(new _output2.default(sum - amount, fromAddr));
  }

  var tx = _transaction2.default.transfer(height, inputs, outputs);

  if (privKey) {
    return tx.sign(tx.inputs.map(function () {return privKey;}));
  }

  return tx;
}