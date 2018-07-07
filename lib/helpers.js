import Outpoint from './outpoint';
import Input from './input';
import Output from './output';

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
      new extend.Method({
        name: 'getColor',
        call: 'parsec_getColor',
        params: 1,
        inputFormatters: [
          extend.formatters.inputAddressFormatter,
        ],
        outputFormatter: Number,
      }),
    ],
  });
  return web3Instance;
}

export function calcInputs(unspent, amount) {
  if (unspent.length === 0) {
    throw new Error('Unspent is empty');
  }

  const inputs = [];
  let sum = 0;
  for (let i = 0; i < unspent.length; i += 1) {
    inputs.push(new Input(unspent[i].outpoint));
    sum += unspent[i].output.value;

    if (sum >= amount) {
      break;
    }
  }

  return inputs;
}

// ToDo: handle inputs from different accounts
export function calcOutputs(unspent, inputs, from, to, amount) {
  if (unspent.length === 0) {
    throw new Error('Unspent is empty');
  }

  const inInputs = u => inputs.findIndex(input => u.outpoint.equals(input.prevout)) > -1;
  const sum = unspent.filter(inInputs).reduce((a, u) => a + u.output.value, 0);

  if (sum < amount) {
    throw new Error('Not enought inputs');
  }

  const outputs = [new Output(amount, to.toLowerCase())];
  if (sum > amount) {
    outputs.push(new Output(sum - amount, from.toLowerCase()));
  }

  return outputs;
}
