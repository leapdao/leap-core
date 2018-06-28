import Outpoint from './outpoint';
import Input from './input';
import Output from './output';
import Tx from './transaction';

export function extendWeb3(web3Instance) {
  // `_extend` for web3 0.2x.x, `extend` for 1.x
  const extend = web3Instance._extend || web3Instance.extend; // eslint-disable-line no-underscore-dangle, max-len
  extend({
    methods: [
      new extend.Method({
        name: 'getUnspent',
        call: 'parsec_unspent',
        params: 1,
        inputFormatters: [
          extend.formatters.inputAddressFormatter,
        ],
        outputFormatter: unspent => ({
          output: unspent.output,
          outpoint: Outpoint.fromRaw(unspent.outpoint),
        }),
      }),
    ],
  });
  return web3Instance;
}

// ToDo: simplify it, helper shouldn't care about signing tx or setting height
// main purpose — build inputs and outputs
export function makeTransferTxFromUnspent(
  unspent,
  from,
  to,
  amount,
  privKey,
  height = 0,
) {
  let fromAddr = from.toLowerCase(); // eslint-disable-line
  to = to.toLowerCase(); // eslint-disable-line

  if (unspent.length === 0) {
    throw new Error('Unspent is empty');
  }

  const inputs = [];
  const outputs = [new Output(amount, to)];
  let sum = 0;
  for (let i = 0; i < unspent.length; i += 1) {
    inputs.push(new Input(unspent[i].outpoint));
    sum += unspent[i].output.value;

    if (sum >= amount) {
      break;
    }
  }

  if (inputs.length === 0) {
    throw new Error('No inputs');
  }

  if (sum > amount) {
    outputs.push(new Output(sum - amount, fromAddr));
  }

  const tx = Tx.transfer(height, inputs, outputs);

  if (privKey) {
    return tx.sign(tx.inputs.map(() => privKey));
  }

  return tx;
}
