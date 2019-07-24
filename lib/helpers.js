/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import { bufferToHex } from 'ethereumjs-util';
import { add, bi, ZERO } from 'jsbi-utils';
import Output from './output';
import Outpoint from './outpoint';
import Period from './period';
import Input from './input';
import Tx from './transaction';

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
      new extend.Method({
        ...getUnspent,
        name: 'getUnspentByAddress',
        params: 1,
      }),
      new extend.Method({
        ...getUnspent,
        name: 'getUnspentByAddressColor',
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

  web3Instance.getUnspent = (...params) => {
    const last = params[params.length - 1];
    const hasCb = typeof last === 'function';
    if (params.length === (hasCb ? 2 : 1)) {
      return web3Instance.getUnspentByAddress(...params);
    }

    return web3Instance.getUnspentByAddressColor(...params);
  };

  return web3Instance;
}

/**
 * DEPRECATED: Use Transaction.calcInputs instead
 */
export function calcInputs(unspent, from, amount, color) {
  return Tx.calcInputs(unspent, from, amount, color);
}

/**
 * DEPRECATED: Use Transaction.calcOutputs instead
 */
export function calcOutputs(unspent, inputs, from, to, amount, color) {
  return Tx.calcOutputs(unspent, inputs, from, to, amount, color);
}

/**
 * DEPRECATED: Use Period.periodBlockRange instead
 */
export function periodBlockRange(blockNumber) {
  return Period.periodBlockRange(blockNumber);
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
    tx.inputs.map(i => (plasma.eth || plasma).getTransaction(bufferToHex(i.prevout.hash)))
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
  if (round >= 50) return Promise.reject(
    new Error('Transaction not included in block after 5 secs.')
  );

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
          return resolve(res.result);
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

/**
 * Sends a signed transaction to the node
 *
 * @param {Unspent[]} utxos - transaction to send
 * @returns {LeapTransaction[]} array of consolidate transactions
 */
export function consolidateUTXOs(utxos) {
  if (utxos.length === 0) {
    return [];
  }
  const colors = Array.from(new Set(utxos.map(u => u.output.color)));
  const addrs = Array.from(new Set(utxos.map(u => u.output.address)));

  if (colors.length > 1) {
    throw new Error(`Expected UTXOs only for one color, got ${colors.length}`);
  }

  if (addrs.length > 1) {
    throw new Error(`Expected UTXOs only for one address, got ${addrs.length}`);
  }

  const [color] = colors;
  const [address] = addrs;

  const chunks = [[]];
  utxos.forEach((utxo, i) => {
    const currentChunk = chunks[chunks.length - 1];
    currentChunk.push(utxo);
    if (currentChunk.length === 15 && i !== utxos.length - 1) {
      chunks.push([]);
    }
  });

  return chunks.map(chunk => {
    const inputs = chunk.map(u => new Input(u.outpoint));
    const value = chunk.reduce((v, u) => add(v, bi(u.output.value)), ZERO);
    return Tx.transfer(inputs, [
      new Output(value, address, Number(color)),
    ]);
  });
}
