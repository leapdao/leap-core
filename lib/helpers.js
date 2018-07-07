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
          extend.formatters.inputAddressFormatter, // account address
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
          extend.formatters.inputAddressFormatter, // token contract address
        ],
        outputFormatter: Number,
      }),
    ],
  });
  return web3Instance;
}

export function calcInputs(unspent, from, amount, color) {
  const myUnspent = unspent.filter(
    ({ output }) => output.color === color && output.address.toLowerCase() === from.toLowerCase(),
  );

  const inputs = [];
  let sum = 0;
  for (let i = 0; i < myUnspent.length; i += 1) {
    inputs.push(new Input(myUnspent[i].outpoint));
    sum += myUnspent[i].output.value;

    if (sum >= amount) {
      break;
    }
  }

  if (sum < amount) {
    throw new Error('Not enough inputs');
  }

  return inputs;
}

// ToDo: handle inputs from different accounts
// ToDo: handle different input colors
export function calcOutputs(unspent, inputs, from, to, amount, color) {
  if (unspent.length === 0) {
    throw new Error('Unspent is empty');
  }

  const inInputs = u => inputs.findIndex(input => u.outpoint.equals(input.prevout)) > -1;
  const sum = unspent.filter(inInputs).reduce((a, u) => a + u.output.value, 0);

  if (sum < amount) {
    throw new Error('Not enough inputs');
  }

  const outputs = [new Output(amount, to.toLowerCase(), color)];
  if (sum > amount) {
    outputs.push(new Output(sum - amount, from.toLowerCase(), color));
  }

  return outputs;
}
