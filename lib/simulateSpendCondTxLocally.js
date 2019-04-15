/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the Mozilla Public License Version 2.0
 * found in the LICENSE file in the root directory of this source tree.
 */

const Transaction = require('ethereumjs-tx');
const VM = require('ethereumjs-vm');
const utils = require('ethereumjs-util');
const { BigInt, add, divide, subtract, lessThan } = require('jsbi-utils');
const isEqual = require('lodash/isEqual');

const {isNFT} = require ('./util')
// const { checkInsAndOuts, groupValuesByColor } = require('./utils');

const Type = require('./type')
const OutPoint = require('./outpoint')
import  Output from './output'
import Outpoint from './outpoint';
//const getColors = require('../../api/methods/getColors');
//const { NFT_COLOR_BASE } = require('../../api/methods/constants');

const { Account } = VM.deps;

const groupValuesByColor = (values, { color, value }) => {
  if (!isNFT(color) && lessThan(BigInt(value), BigInt(1))) {
    throw new Error('One of the outs has value < 1');
  }
  return Object.assign({}, values, {
    [color]: isNFT(color)
      ? (values[color] || new Set()).add(BigInt(value))
      : add(values[color] || BigInt(0), BigInt(value)),
  });
};



// commpiled https://github.com/leapdao/spending-conditions/blob/master/contracts/ERC20Min.sol
const erc20Code = Buffer.from(
  '608060405234801561001057600080fd5b506004361061005d577c0100000000000000000000000000000000000000000000000000000000600035046340c10f19811461006257806370a08231146100a2578063a9059cbb146100da575b600080fd5b61008e6004803603604081101561007857600080fd5b50600160a060020a038135169060200135610106565b604080519115158252519081900360200190f35b6100c8600480360360208110156100b857600080fd5b5035600160a060020a0316610128565b60408051918252519081900360200190f35b61008e600480360360408110156100f057600080fd5b50600160a060020a038135169060200135610143565b60006001331461011557600080fd5b61011f8383610150565b50600192915050565b600160a060020a031660009081526020819052604090205490565b600061011f3384846101e4565b600160a060020a038216151561016557600080fd5b600160a060020a03821660009081526020819052604090205461018e908263ffffffff6102b116565b600160a060020a0383166000818152602081815260408083209490945583518581529351929391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a35050565b600160a060020a03821615156101f957600080fd5b600160a060020a038316600090815260208190526040902054610222908263ffffffff6102ca16565b600160a060020a038085166000908152602081905260408082209390935590841681522054610257908263ffffffff6102b116565b600160a060020a038084166000818152602081815260409182902094909455805185815290519193928716927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a3505050565b6000828201838110156102c357600080fd5b9392505050565b6000828211156102d957600080fd5b5090039056fea165627a7a72305820b48eed6297042d728d0fddfa2756bf34e6a1faa2965516c2d03dbfc53e01065d0029',
  'hex'
);

const REACTOR_ADDR = Buffer.from(
  '0000000000000000000000000000000000000001',
  'hex'
);

const MINT_FUNCSIG = Buffer.from(
  '40c10f19000000000000000000000000',
  'hex'
);

function setAccount(account, address, stateManager) {
  return new Promise((resolve, reject) => {
    stateManager.putAccount(address, account, (err) => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

function getAccount(address, stateManager) {
  return new Promise((resolve, reject) => {
    stateManager.getAccount(address, (err, acc) => {
      if (err) {
        return reject(err);
      }
      return resolve(acc);
    });
  });
}

function setAccountCode(code, address, stateManager) {
  return new Promise((resolve, reject) => {
    stateManager.putContractCode(address, code, (err) => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

// runs a transaction through the vm
function runTx(vm, raw) {
  // create a new transaction out of the js object
  const tx = new Transaction(raw);
  Object.defineProperty(tx, 'from', {
    // instead of tx.sign(Buffer.from(secretKey, 'hex'))
    // eslint-disable-next-line object-shorthand
    get() {
      return REACTOR_ADDR;
    },
  });

  return new Promise((resolve, reject) => {
    // run the tx \o/
    vm.runTx({ tx }, (err, results) => {
      if (err) {
        return reject(err);
      }
      if (results.vm.exceptionError) {
        return reject(results.vm.exceptionError);
      }
      return resolve(results);
    });
  });
}

const addColors = (map, colors, colorBase = 0) => {
  colors.forEach((color, i) => {
    map[i + colorBase] = Buffer.from(color.replace('0x', ''), 'hex');
  });
};

module.exports = async (tx, state, nodeConfig = {}) => {
  if (tx.type !== Type.SPEND_COND) {
    throw new Error('Spending Condition tx expected');
  }
  if (nodeConfig.network && nodeConfig.network.noSpendingConditions) {
    throw new Error('Spending Conditions are not supported on this network');
  }

  const colorMap = { '0':
  Buffer.from('0000000000000000000000000000000000000000', 'hex'),
 '1':
  Buffer.from('1111111111111111111111111111111111111111', 'hex') }


  // TODO make inputMap
  // convenience mapping from inputs to the previous outputs
  const inputMap = {};
  for (let i = 0; i < tx.inputs.length; i += 1) {
    inputMap[tx.inputs[i].prevout.getUtxoId()] =
      state.unspent[tx.inputs[i].prevout.hex()];
  }

  // creating a new VM instance
  const vm = new VM({ hardfork: 'petersburg' });

  // creating the reactor account with some wei
  const reactorAccount = new Account();
  reactorAccount.balance = '0xf00000000000000001';
  await setAccount(reactorAccount, REACTOR_ADDR, vm.stateManager);
  

  // deploying colors and mint tokens
  let results;
  let nonceCounter = 0;

  const sigHashBuf = tx.sigHashBuf();
  const insValues = Object.values(inputMap).reduce(groupValuesByColor, {});

  // eslint-disable-next-line  guard-for-in
  for (const color in insValues) {
    // eslint-disable-next-line no-await-in-loop
    await setAccountCode(erc20Code, colorMap[color], vm.stateManager); // eslint-disable-line no-await-in-loop

    // minting amount of output to address of condition
    const amountHex = utils.setLengthLeft(
      utils.toBuffer(`0x${BigInt(insValues[color]).toString(16)}`),
      32
    );
    // eslint-disable-next-line no-await-in-loop
    await runTx(vm, {
      nonce: nonceCounter,
      gasLimit: '0xffffffffffff',
      to: colorMap[color],
      data: Buffer.concat([MINT_FUNCSIG, sigHashBuf, amountHex]),
    });
    nonceCounter += 1;
  }

  // deploying conditions
  tx.inputs.forEach(async input => {
    // TODO: what if there are multiple condition scripts in one tx?
    await setAccountCode(input.script, sigHashBuf, vm.stateManager);
  });

  // need to commit to trie, needs a checkpoint first 🤪
  await new Promise((resolve) => {
    vm.stateManager.checkpoint(() => {
      vm.stateManager.commit(() => {
        resolve();
      });
    });
  });

  const logOuts = [];
  const colorGasSums = {};
  // running conditions with msgData
  for (let i = 0; i < tx.inputs.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    results = await runTx(vm, {
      nonce: nonceCounter,
      gasLimit: 6000000, // TODO: set gas Limit to (inputs - outputs) / gasPrice
      to: sigHashBuf, // the plasma address is replaced with sighash, to prevent replay attacks
      data: tx.inputs[i].msgData,
    });
    nonceCounter += 1;

    const out = inputMap[tx.inputs[i].prevout.getUtxoId()];

    if (colorGasSums[out.color]) {
      colorGasSums[out.color] = add(
        colorGasSums[out.color],
        BigInt(results.gasUsed)
      );
    } else {
      colorGasSums[out.color] = BigInt(results.gasUsed);
    }
    // iterate through all transfer events and get compact outs
    results.vm.logs.forEach(log => {
      if (log[0].equals(colorMap[out.color])) {
        const transferAmount = BigInt(`0x${log[2].toString('hex')}`, 16);
        let toAddr = log[1][2].slice(12, 32);
        // replace injected sigHash with plasma address
        if (toAddr.equals(sigHashBuf)) {
          toAddr = utils.ripemd160(tx.inputs[i].script);
        }
        var added = false;
        logOuts.forEach((item,i) => {
          if (item.address === `0x${toAddr.toString('hex')}` && item.color === out.color){
            logOuts[i] = new Output(transferAmount, `0x${toAddr.toString('hex')}`, out.color);
            added = true;
          }          
        });
        if (!added){
        logOuts.push(new Output(transferAmount, `0x${toAddr.toString('hex')}`, out.color));
        }
      }
    });
  }
/*
  const bridgeState = { tokens:
    { erc20:
       [ '0x0000000000000000000000000000000000000000',
         '0x1111111111111111111111111111111111111111' ],
      erc721: [] },
   minGasPrices: [ 100 ] }
  // eslint-disable-next-line  guard-for-in
  for (const color in insValues) {
    const gasPrice = divide(
      subtract(insValues[color], outsValues[color]),
      colorGasSums[color]
    );
    const minGasPrice = BigInt(
      bridgeState.minGasPrices[bridgeState.minGasPrices.length - 1]
    );
    if (lessThan(gasPrice, minGasPrice)) {
      return Promise.reject(
        new Error(
          `tx gasPrice ${gasPrice.toString()} less than minGasPRice: ${minGasPrice.toString()}`
        )
      );
    }
  } */

  const outsValues = logOuts.reduce(groupValuesByColor, {});
  if (!isEqual(insValues, outsValues)) {
    const ins = insValues
      .map(item => JSON.stringify(item.toJSON()))
      .join(',');
    const outs = outsValues
      .map(output => JSON.stringify(output.toJSON()))
      .join(',');
    return Promise.reject(
      new Error(
        `UTXO do not keep consistency. \n inputs ${ins} \n outputs: ${outs}`
      )
    );
  }

  return logOuts
  
  return Promise.resolve();
};
