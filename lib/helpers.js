/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import { bufferToHex } from 'ethereumjs-util';
import Output from './output';
import Outpoint from './outpoint';
import Period from './period';
import Tx from './transaction';

const fromRaw = u => ({
  output: u.output,
  outpoint: Outpoint.fromRaw(u.outpoint),
});

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
        name: '_getUnspent',
      }),
      new extend.Method({
        ...getUnspent,
        params: 1,
        name: 'getUnspentByAddress',
      }),
      new extend.Method({
        ...getUnspent,
        params: 0,
        name: 'getUnspentAll',
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
        name: '_getColors',
        call: 'plasma_getColors',
        params: 2,
        inputFormatters: [a => a, a => a],
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
      new extend.Method({
        name: 'checkSpendingCondition',
        call: 'checkSpendingCondition',
        params: 1,
        inputFormatters: [tx => tx.hex()],
        outputFormatter: ({ error, outputs }) => ({
          error,
          outputs: outputs.map(Output.fromJSON)
        }),
      }),
      new extend.Method({
        name: 'getPeriodByBlockHeight',
        call: 'plasma_getPeriodByBlockHeight',
        params: 1,
        inputFormatters: [a => a],
        outputFormatter: a => a,
      }),
    ],
  });

  web3Instance.getUnspent = (...params) => {
    const hasCb = typeof params[params.length - 1] === 'function';
    const paramCount = hasCb ? params.length - 1 : params.length;
  
    if (paramCount === 0) {
      return web3Instance.getUnspentAll();
    }
  
    if (paramCount === 1) {
      return web3Instance.getUnspentByAddress(...params);
    }
  
    return web3Instance._getUnspent(...params); // eslint-disable-line no-underscore-dangle
  }

  /* eslint-disable no-underscore-dangle */
  web3Instance.getColors = (type) => {
    const typeStr = (type || '').toLowerCase();
    if (typeStr === 'erc721' || typeStr === 'nft') {
      return web3Instance._getColors(true, null);
    }
    if (typeStr === 'erc1948' || type === 'nst') {
      return web3Instance._getColors(false, true);
    }

    if (typeStr === 'erc20') {
      return web3Instance._getColors(false, false);
    }

    return Promise.all([
      web3Instance._getColors(false, false),
      web3Instance._getColors(true, false),
      web3Instance._getColors(false, true),
    ]).then(([erc20, erc721, erc1948]) => ({ erc20, erc721, erc1948 }));
  }
  /* eslint-enable no-underscore-dangle */
  
  return web3Instance;
}

/**
 * DEPRECATED: Use Transaction.calcInputs instead
 */
export function calcInputs(unspent, from, amount, color) {
  console.warn('DEPRECATED: use Tx.calcInputs instead'); // eslint-disable-line no-console
  return Tx.calcInputs(unspent, from, amount, color);
}

/**
 * DEPRECATED: Use Transaction.calcOutputs instead
 */
export function calcOutputs(unspent, inputs, from, to, amount, color) {
  console.warn('DEPRECATED: use Tx.calcOutputs instead'); // eslint-disable-line no-console
  return Tx.calcOutputs(unspent, inputs, from, to, amount, color);
}

/**
 * DEPRECATED: Use Period.periodBlockRange instead
 */
export function periodBlockRange(blockNumber) {
  console.warn('DEPRECATED: use Period.periodBlockRange instead'); // eslint-disable-line no-console
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
 * @param {ExtendedWeb3|LeapProvider} plasma instance of Leap Web3
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
 * @param {ExtendedWeb3|LeapProvider} plasma instance of Leap Web3
 * @param {LeapTransaction} tx
 * @param {PeriodOpts} periodOpts — options for cosntructed Period as defined in Period constructor
 * @returns {Promise<Proof>} promise that resolves to period inclusion proof
 */
export function getProof(plasma, tx, periodOpts = {}) {
  return plasma.getPeriodByBlockHeight(tx.blockNumber)
    .then(periodData => {
      if (periodData && periodData.length) {
        Object.assign(periodOpts, {
          validatorData: periodData[0],
        });
      } else {
        const msg = `No period data for the given tx. Height: ${tx.blockNumber}`;
        if (!periodOpts.validatorData) {
          throw new Error(msg);
        } else {
          console.warn(msg, 'Using fallback values'); // eslint-disable-line no-console
        }
      }
      return Period.periodForTx(plasma, tx, periodOpts);
    }).then((period) => {
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
 * @param {string} txHex - transaction to send
 * @returns {Promise<Receipt>} promise that resolves to a transaction receipt
 */
export function sendSignedTransaction(plasma, txHex) {
  // eslint-disable-next-line no-console
  console.warn('DEPRECATED: use Web3#sendSignedTransaction or LeapProvider#sendTransaction instead');
  return send(plasma, txHex).then((resp) => {
    return awaitForReceipt(resp, Promise.resolve(), plasma, 0);
  });
}

/**
 * DEPRECATED: use Tx.consolidateUTXOs instead
 */
export function consolidateUTXOs(utxos) {
  console.warn('DEPRECATED: use Tx.consolidateUTXOs instead'); // eslint-disable-line no-console
  return Tx.consolidateUTXOs(utxos);
}

/**
 * Returns outputs for spending condition tx
 *
 * @param {ExtendedWeb3 | LeapProvider} plasma
 * @param {Tx} tx
 *
 * @returns {Promise<Array<Output>>}
 */
export function simulateSpendCond(plasma, tx) {
  return plasma.checkSpendingCondition(tx);
}