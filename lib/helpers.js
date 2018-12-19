
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import { bufferToHex } from 'ethereumjs-util';
import Outpoint from './outpoint';
import Input from './input';
import Output from './output';
import Period from './period';
import Tx from './transaction';

import { BLOCKS_PER_PERIOD } from './constants';

export function extendWeb3(web3Instance) {
  // `_extend` for web3 0.2x.x, `extend` for 1.x
  const extend = web3Instance._extend || web3Instance.extend; // eslint-disable-line no-underscore-dangle, max-len
  extend({
    methods: [
      new extend.Method({
        name: 'getUnspent',
        call: 'plasma_unspent',
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
        call: 'plasma_getColor',
        params: 1,
        inputFormatters: [
          extend.formatters.inputAddressFormatter, // token contract address
        ],
        outputFormatter: Number,
      }),
      new extend.Method({
        name: 'getColors',
        call: 'plasma_getColors',
        params: 0,
        inputFormatters: [],
        outputFormatter: String,
      }),
      new extend.Method({
        name: 'status',
        call: 'plasma_status',
        params: 0,
        inputFormatters: [],
        outputFormatter: String,
      }),
      new extend.Method({
        name: 'getConfig',
        call: 'plasma_getConfig',
        params: 0,
        inputFormatters: [],
        outputFormatter: a => a,
      }),
      new extend.Method({
        name: 'getValidatorInfo',
        call: 'validator_getAddress',
        params: 0,
        inputFormatters: [],
        outputFormatter: a => a,
      }),
    ],
  });
  return web3Instance;
}

export function calcInputs(unspent, from, amount, color) {
  const myUnspent = unspent.filter(
    ({ output }) =>
      output.color === color &&
      output.address.toLowerCase() === from.toLowerCase(),
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

/**
 * Returns the block number interval for the period given block is included to.
 *
 * @param {Number} blockNumber block height of the block we are getting period block range for
 * @returns {Array} block interval in [startBlock: number, endBlock: number] format
 */
export function periodBlockRange(blockNumber) {
  return [
    Math.floor(blockNumber / BLOCKS_PER_PERIOD) * BLOCKS_PER_PERIOD,
    Math.ceil(blockNumber / BLOCKS_PER_PERIOD) * BLOCKS_PER_PERIOD,
  ];
}

/**
 * Finds the youngest tx in a given array.
 *
 * Youngest tx is the one with biggest block number.
 * @param {LeapTransaction[]} txs
 * @returns {InputTx} youngest tx and its index
 */
export function getTxWithYoungestBlock(txs) {
  let youngestIndex = 0;
  let youngestInput = txs[0];
  txs.forEach((tx, i) => {
    if (tx.blockNumber > youngestInput.blockNumber) {
      youngestIndex = i;
      youngestInput = tx;
    }
  });
  return { index: youngestIndex, tx: youngestInput };
}

/**
 * Returns the youngest input for a given tx.
 *
 * Youngest input is the one which references tx with biggest block number.
 * @param {ExtendedWeb3} plasma instance of Leap Web3
 * @param {Tx} tx
 * @returns {Promise<InputTx>} promise that resolves to youngest input tx and its index
 */
export function getYoungestInputTx(plasma, tx) {
  return Promise.all(tx.inputs.map(i =>
    plasma.eth.getTransaction(bufferToHex(i.prevout.hash)),
  )).then(getTxWithYoungestBlock);
}

/**
 * Creates proof of period inclusion for a given tx
 *
 * @param {ExtendedWeb3} plasma instance of Leap Web3
 * @param {LeapTransaction} tx
 * @returns {Promise<Proof>} promise that resolves to period inclusion proof
 */
export function getProof(plasma, tx) {
  return Period.periodForTx(plasma, tx).then(period =>
    period.proof(Tx.fromRaw(tx.raw)),
  );
}
