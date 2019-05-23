/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import { bufferToHex } from 'ethereumjs-util';
import {
  BigInt,
  add,
  subtract,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  equal,
} from 'jsbi-utils';
import Outpoint from './outpoint';
import Input from './input';
import Output from './output';
import Period from './period';
import Tx from './transaction';

import { BLOCKS_PER_PERIOD } from './constants';

function getLowerCase(value) {
  if (value) {
    return value.toLowerCase();
  }
  return value;
}

const fromRaw = u => ({
  output: u.output,
  outpoint: Outpoint.fromRaw(u.outpoint),
});

export class LeapEthers {
  /**
   * @param { import("ethers").providers.JsonRpcProvider } provider
   */
  constructor(provider) {
    this.provider = provider;
  }

  getUnspent(...params) {
    return this.provider
      .send('plasma_unspent', params.map(getLowerCase))
      .then(unspent => unspent.map(fromRaw));
  }

  getUnspentByAddress(...params) {
    return this.getUnspent(params);
  }

  getUnspentAll() {
    return this.provider
      .send('plasma_unspent', [])
      .then(unspent => unspent.map(fromRaw));
  }

  getColor(...params) {
    return this.provider.send('plasma_getColor', params.map(getLowerCase));
  }

  getColors() {
    return this.provider.send('plasma_getColors', []);
  }

  status() {
    return this.provider.send('plasma_status', []);
  }

  getConfig() {
    return this.provider.send('plasma_getConfig', []);
  }

  getValidatorInfo() {
    return this.provider.send('validator_getAddress', []);
  }
}

export function extendWeb3(web3Instance) {
  // `_extend` for web3 0.2x.x, `extend` for 1.x
  const extend = web3Instance._extend || web3Instance.extend; // eslint-disable-line no-underscore-dangle, max-len

  const getUnspent = {
    name: 'getUnspent',
    call: 'plasma_unspent',
    params: 2,
    inputFormatters: [
      extend.formatters.inputAddressFormatter, // account address
    ],
    outputFormatter: unspent => {
      if (Array.isArray(unspent)) {
        // web3 0.2x.x passes in an array
        return unspent.map(fromRaw);
      }
      return fromRaw(unspent);
    },
  };

  extend({
    methods: [
      new extend.Method(getUnspent),
      new extend.Method({
        ...getUnspent,
        name: 'getUnspentByAddress',
        params: 1,
      }),
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
  return web3Instance;
}

export function calcInputs(unspent, from, amount, color) {
  const myUnspent = unspent.filter(
    ({ output }) =>
      output.color === color &&
      output.address.toLowerCase() === from.toLowerCase()
  );

  const exact = myUnspent.find(utxo =>
    equal(BigInt(utxo.output.value), BigInt(amount))
  );

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

  const inInputs = u =>
    inputs.findIndex(input => u.outpoint.equals(input.prevout)) > -1;
  const sum = unspent
    .filter(inInputs)
    .reduce((a, u) => add(a, BigInt(u.output.value)), BigInt(0));

  if (lessThan(sum, BigInt(amount))) {
    throw new Error('Not enough inputs');
  }

  const outputs = [new Output(amount, to.toLowerCase(), color)];
  if (greaterThan(sum, BigInt(amount))) {
    outputs.push(
      new Output(subtract(sum, BigInt(amount)), from.toLowerCase(), color)
    );
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
  return txs.reduce(
    (res, tx, i) => {
      if (tx.blockNumber > res.tx.blockNumber) {
        res.index = i;
        res.tx = tx;
      }
      return res;
    },
    { index: 0, tx: txs[0] }
  );
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
  return Promise.all(
    tx.inputs.map(i => plasma.eth.getTransaction(bufferToHex(i.prevout.hash)))
  ).then(getTxWithYoungestBlock);
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

/**
 * Polls the node for transaction receipt 50 times with 100 ms interval (5 seconds in total).
 * Resolves to tx receipt if it is available, otherwise resolves to nothing.
 */
const awaitForReceipt = (txHash, promise, plasma, round) => {
  if (round >= 50) return Promise.reject('Transaction not included in block after 5 secs.');

  return promise.then((receipt) => {
    if (receipt && receipt.blockHash) {
      return Promise.resolve(receipt);
    }

    const next = new Promise(resolve => 
      setTimeout(() => (plasma.eth || plasma).getTransaction(txHash).then(resolve), 100)
    );

    return awaitForReceipt(txHash, next, plasma, round + 1);
  });
};

const send = (plasma, txHex) => {
  if (plasma.currentProvider) { // Web3
    return new Promise((resolve, reject) => {
      plasma.currentProvider.send(
        {
          jsonrpc: '2.0',
          id: 42,
          method: 'eth_sendRawTransaction',
          params: [txHex],
        },
        (err, res) => {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        }
      );
    });
  }
  return plasma.send('eth_sendRawTransaction', [txHex]); // Ethers.js
};


/**
 * Sends a signed transaction to the node
 *
 * @param {ExtendedWeb3} plasma instance of Leap Web3 or JSONRPCProvider of Ethers.js
 * @param {LeapTransaction} txHex - transaction to send
 * @returns {Promise<Receipt>} promise that resolves to a transaction receipt
 */
export function sendSignedTransaction(plasma, txHex) {
  return send(plasma, txHex).then((resp) => {
    return awaitForReceipt(resp, Promise.resolve(), plasma, 0);
  });
}
