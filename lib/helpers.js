
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import { bufferToHex } from 'ethereumjs-util';
import { BigInt, add, subtract, greaterThan, greaterThanOrEqual, lessThan, equal } from 'jsbi-utils';
import Outpoint from './outpoint';
import Input from './input';
import Output from './output';
import Period from './period';
import Tx from './transaction';

// Hard to use web3-core-method package. It requires a lot of deps
// that should be synced with web3 version, so i had to copypaste this class
// and patch it a bit (remove async/await and some meaningless stuff like cloneDeep)
import AbstractMethod from './web3/AbstractMethod';

import { BLOCKS_PER_PERIOD } from './constants';

const formatUtxo = utxo => ({
  output: Output.fromJSON(utxo.output),
  outpoint: Outpoint.fromRaw(utxo.outpoint),
})

export function extendWeb3(web3Instance) {
  // `_extend` for web3 0.2x.x, `extend` for 1.x
  const extend = web3Instance._extend || web3Instance.extend; // eslint-disable-line no-underscore-dangle, max-len

  if (extend) {
    const getUnspent = {
      name: 'getUnspent',
      call: 'plasma_unspent',
      params: 1,
      inputFormatters: [
        extend.formatters.inputAddressFormatter, // account address
      ],
      outputFormatter: (unspent) => {
        if (Array.isArray(unspent)) {
          // web3 0.2x.x passes in an array
          return unspent.map(formatUtxo);
        }
        return formatUtxo(unspent);
      },
    };
    extend({
      methods: [
        new extend.Method(getUnspent),
        new extend.Method({
          ...getUnspent,
          name: 'getUnspentAll',
          params: 0,
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
  } else { // web3 since 1.0.0-beta.38 has no extend
    const getConfig = () => {
      const method = new AbstractMethod('plasma_getConfig', 0, null, null, web3Instance);
      return method.execute();
    }

    const getColor = (...args) => {
      const method = new AbstractMethod('plasma_getColor', 1, null, null, web3Instance);
      method.setArguments(args);
      return method.execute().then(Number);
    }

    const getUnspent = (...args) => {
      const method = new AbstractMethod('plasma_unspent', 1, null, null, web3Instance);
      method.setArguments(args);
      return method.execute().then(utxos => utxos.map(formatUtxo));
    }

    const getUnspentAll = () => {
      const method = new AbstractMethod('plasma_unspent', 0, null, null, web3Instance);
      return method.execute().then(utxos => utxos.map(formatUtxo));
    }

    const getStatus = () => {
      const method = new AbstractMethod('plasma_status', 0, null, null, web3Instance);
      return method.execute();
    }

    const getValidatorInfo = () => {
      const method = new AbstractMethod('validator_getAddress', 0, null, null, web3Instance);
      return method.execute();
    }

    web3Instance.getConfig = getConfig;
    web3Instance.getColor = getColor;
    web3Instance.getUnspent = getUnspent;
    web3Instance.getUnspentAll = getUnspentAll;
    web3Instance.getStatus = getStatus;
    web3Instance.getValidatorInfo = getValidatorInfo;
  }

  return web3Instance;
}

export function calcInputs(unspent, from, amount, color) {
  const myUnspent = unspent.filter(
    ({ output }) =>
      output.color === color &&
      output.address.toLowerCase() === from.toLowerCase(),
  );

  const exact = myUnspent.find(utxo => equal(BigInt(utxo.output.value), BigInt(amount)));

  if (exact) return [new Input(exact.outpoint)];

  const inputs = [];
  let sum = BigInt(0);
  for (let i = 0; i < myUnspent.length; i += 1) {
    inputs.push(new Input(myUnspent[i].outpoint));
    sum = add(sum, BigInt(myUnspent[i].output.value));

    if (greaterThanOrEqual(sum, BigInt(amount))) {
      break;
    }
  }

  if (lessThan(sum, BigInt(amount))) {
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
  const sum = unspent.filter(inInputs).reduce((a, u) => add(a, BigInt(u.output.value)), BigInt(0));

  if (lessThan(sum, BigInt(amount))) {
    throw new Error('Not enough inputs');
  }

  const outputs = [new Output(amount, to.toLowerCase(), color)];
  if (greaterThan(sum, BigInt(amount))) {
    outputs.push(new Output(subtract(sum, BigInt(amount)), from.toLowerCase(), color));
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
  const periodNum = Math.floor(blockNumber / BLOCKS_PER_PERIOD);
  return [
    periodNum * BLOCKS_PER_PERIOD,
    (periodNum + 1) * BLOCKS_PER_PERIOD - 1,
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
  return txs.reduce((res, tx, i) => {
    if (tx.blockNumber > res.tx.blockNumber) {
      res.index = i;
      res.tx = tx;
    }
    return res;
  }, { index: 0, tx: txs[0] });
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
export function getProof(plasma, tx, slotId, validatorAddr) {
  return Period.periodForTx(plasma, tx).then(period => {
    period.setValidatorData(slotId, validatorAddr);
    return period.proof(Tx.fromRaw(tx.raw));
  });
}
