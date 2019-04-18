/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the Mozilla Public License Version 2.0
 * found in the LICENSE file in the root directory of this source tree.
 */


import Output from './output'
import Outpoint from './outpoint'

const Transaction = require('ethereumjs-tx');
const VM = require('ethereumjs-vm');
const utils = require('ethereumjs-util');
const {
  BigInt,
  add,
  subtract,
  greaterThan,
  lessThan
} = require('jsbi-utils');

const {
  isNFT
} = require('./util')
const Type = require('./type')

const {
  Account
} = VM.deps;

const groupValuesByColor = (values, {
  color,
  value
}) => {
  if (!isNFT(color) && lessThan(BigInt(value), BigInt(1))) {
    throw new Error('One of the outs has value < 1');
  }
  return Object.assign({}, values, {
    [color]: isNFT(color) ?
      (values[color] || new Set()).add(BigInt(value)) : add(values[color] || BigInt(0), BigInt(value)),
  });
};

// commpiled https://github.com/leapdao/spending-conditions/blob/master/contracts/ERC20Min.sol
const minErc20Code = Buffer.from(
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
    vm.runTx({
      tx
    }, (err, results) => {
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

function aggregateLogOutsByColorFromTo(logOuts) {
  const colorOuts = {}
  logOuts.forEach(item => {
    if (colorOuts[item.color]) {
      colorOuts[item.color].push({ from: item.from, to: item.to, amount: item.amount })
    }
    else {
      colorOuts[item.color] = [{ from: item.from, to: item.to, amount: item.amount }]
    }
  })

  const colorFromOuts = {}
  Object.keys(colorOuts).forEach(color => {
    colorFromOuts[color] = {}
  })
  Object.keys(colorOuts).forEach(color => {
    colorOuts[color].forEach(out => {
      if (colorFromOuts[color][out.from]) {
        const ii = colorFromOuts[color][out.from].findIndex(item => item.to === out.to);
        if (ii !== -1) {
          colorFromOuts[color][out.from][ii] = { to: out.to, amount: add(out.amount, colorFromOuts[color][out.from][ii].amount) }
        }
      } else {
        colorFromOuts[color][out.from] = [{ to: out.to, amount: out.amount }]
      }
    }
    )
  })
  return colorFromOuts
}

function calcOutputs(unspent, inputs, aggregatedOuts) {
  if (unspent.length === 0) {
    throw new Error('Unspent is empty');
  }
  const outputs = []
  Object.keys(aggregatedOuts).forEach(color => {
    const inInputs = u => {
      return inputs.findIndex(input =>
        u.outpoint.hash.equals(input.prevout.hash) &&
        (u.outpoint.index === input.prevout.index)) > -1;
    }
    const isColor = u => color == u.output.color;
    let sum = unspent.filter(isColor).filter(inInputs).reduce((a, u) => add(a, BigInt(u.output.value)), BigInt(0));

    Object.keys(aggregatedOuts[color]).forEach(from => {
      aggregatedOuts[color][from].forEach(out => {
        if (lessThan(sum, BigInt(out.amount))) {
          throw new Error('Not enough inputs');
        }
        sum = subtract(sum, BigInt(out.amount));
        outputs.push(new Output(out.amount, out.to.toLowerCase(), color));
      })
      if (greaterThan(sum, BigInt(0))) {
        outputs.push(new Output(sum, from.toLowerCase(), color));
      }
    })
  })
  return outputs;
}

// user should provide erc20 addresses used in tx's spend condition contracts,  
module.exports = async (tx, erc20sToBeUsed, state) => {
  if (tx.type !== Type.SPEND_COND) {
    throw new Error('Spending Condition tx expected');
  }

  const colorAddrMap = {}
  Object.keys(erc20sToBeUsed).forEach(item => {
    colorAddrMap[item] = Buffer.from(erc20sToBeUsed[item].address.replace('0x', ''), 'hex')
  })

  const inputMap = {};
  for (let i = 0; i < tx.inputs.length; i += 1) {
    inputMap[tx.inputs[i].prevout.getUtxoId()] =
      state.unspent[tx.inputs[i].prevout.hex()];
  }

  // creating a new VM instance
  const vm = new VM({
    hardfork: 'petersburg'
  });

  // creating the reactor account with some wei
  const reactorAccount = new Account();
  reactorAccount.balance = '0xf00000000000000001';
  await setAccount(reactorAccount, REACTOR_ADDR, vm.stateManager);

  let nonceCounter = 0;
 // const insValues = Object.values(inputMap).reduce(groupValuesByColor, {});
  
  // deploy erc20 contracts used in this simulation
  // eslint-disable-next-line  guard-for-in
  for (const color in Object.keys(colorAddrMap)) {
    // eslint-disable-next-line no-await-in-loop
    await setAccountCode(erc20sToBeUsed[color].erc20code || minErc20Code, colorAddrMap[color], vm.stateManager); // eslint-disable-line no-await-in-loop
  }

  // mint tokens according to unspent
  const keys = Object.keys(state.unspent)
  // eslint-disable-next-line guard-for-in
  for (const item in Object.keys(state.unspent)) {
    const key = keys[item]
    // minting amount of output to address of condition
    const unspentItem = state.unspent[key]
    const amountHex = utils.setLengthLeft(
      utils.toBuffer(`0x${BigInt(unspentItem.value).toString(16)}`),
      32
    );
    const addr = Buffer.from(
      unspentItem.address.replace('0x', ''),
      'hex'
    )
    // eslint-disable-next-line no-await-in-loop
    await runTx(vm, {
      nonce: nonceCounter,
      gasLimit: '0xffffffffffff',
      to: colorAddrMap[unspentItem.color],
      data: Buffer.concat([MINT_FUNCSIG, addr, amountHex]),
    });
    nonceCounter += 1;
  }
  // deploying conditions
  tx.inputs.forEach(async input => {
    // ripemd160 of SpendCond as contract address
    await setAccountCode(input.script, utils.ripemd160(input.script), vm.stateManager);
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
    const results = await runTx(vm, {
      nonce: nonceCounter,
      gasLimit: 600000000, // TODO: set gas Limit to (inputs - outputs) / gasPrice
      to: utils.ripemd160(tx.inputs[i].script), // the plasma address is replaced with sighash, to prevent replay attacks
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
      if (log[0].equals(colorAddrMap[out.color])) {
        const transferAmount = BigInt(`0x${log[2].toString('hex')}`, 16);
        const fromAddr = log[1][1].slice(12, 32);
        const toAddr = log[1][2].slice(12, 32);

        // bypass refund
        if (!toAddr.equals(fromAddr)) {
          let added = false;
          logOuts.forEach((item, ii) => {
            if (item.address === `0x${toAddr.toString('hex')}` && item.color === out.color) {
              logOuts[ii] = { from: `0x${fromAddr.toString('hex')}`, to: `0x${toAddr.toString('hex')}`, color: out.color, amount: transferAmount };
              added = true;
            }
          });
          if (!added) {
            logOuts.push({ from: `0x${fromAddr.toString('hex')}`, to: `0x${toAddr.toString('hex')}`, color: out.color, amount: transferAmount })
          }
        }
      }
    });
  }

  const transformedUnspent = []
  Object.keys(state.unspent).forEach(item => {
    transformedUnspent.push({ output: Output.fromJSON(state.unspent[item]), outpoint: Outpoint.fromRaw(item) })
  })

  const outputs = calcOutputs(transformedUnspent, tx.inputs, aggregateLogOutsByColorFromTo(logOuts))
  if (logOuts.length > 16) {
    throw new Error(`There are ${logOuts.length} outputs which surpass 16, outputs is ${JSON.stringify(logOuts)}`)
  }

  return {
    'outputs': outputs,
    gasUsed: colorGasSums
  }

};