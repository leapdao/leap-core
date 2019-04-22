import { expect } from 'chai';
import ethUtil from 'ethereumjs-util';
import Tx from './transaction'
import Outpoint from './outpoint';
import Input from './input'

const utils = require('ethereumjs-util');
const simSpendCond = require('./simulateSpendCondTxLocally');

// a script exists that can only be spent by spenderAddr defined in script
//
// pragma solidity ^0.5.1;
// import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

// contract SpendingCondition {
//   address constant tokenAddr = 0x1111111111111111111111111111111111111111;
//   address constant spenderAddr = 0x82e8C6Cf42C8D1fF9594b17A3F50e94a12cC860f;

//   function fulfil(
//     bytes32 _r,        // signature
//     bytes32 _s,        // signature
//     uint8 _v,          // signature
//     address _receiver, // output
//     uint256 _amount    // output
//   ) public {
//     // check signature
//     address signer = ecrecover(bytes32(bytes20(address(this))) >> 96, _v, _r, _s);
//     require(signer == spenderAddr);

//     // do transfer
//     IERC20 token = IERC20(tokenAddr);
//     token.transfer(_receiver, _amount);
//   }
// }

const conditionScript1 = Buffer.from(
  '60806040526004361061003b576000357c010000000000000000000000000000000000000000000000000000000090048063052853a914610040575b600080fd5b34801561004c57600080fd5b506100ba600480360360a081101561006357600080fd5b810190808035906020019092919080359060200190929190803560ff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291905050506100bc565b005b600060016060306c01000000000000000000000000026bffffffffffffffffffffffff1916908060020a820491505085888860405160008152602001604052604051808581526020018460ff1660ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa158015610145573d6000803e3d6000fd5b5050506020604051035190507382e8c6cf42c8d1ff9594b17a3f50e94a12cc860f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614151561019f57600080fd5b600073111111111111111111111111111111111111111190508073ffffffffffffffffffffffffffffffffffffffff1663a9059cbb85856040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b15801561025b57600080fd5b505af115801561026f573d6000803e3d6000fd5b505050506040513d602081101561028557600080fd5b8101908080519060200190929190505050505050505050505056fea165627a7a7230582032213765317785ca3ac637818334606c4cf47c408268b26a8cc660455059bfc90029',
  'hex'
);

// a script which generate 18 token transfers
/*
pragma solidity ^0.5.1;
import "./IERC20.sol";

contract SpendingCondition {
  address constant tokenAddr = 0x1111111111111111111111111111111111111111;
  uint160 constant addr = uint160(0x2111111111111111111111111111111111111110);

  function fulfil(
    address _receiver, // output
    uint256 _amount    // output
  ) public {
    
    require(_amount > 17);
    IERC20 token = IERC20(tokenAddr);

    for (uint i = 1; i <= 17; i++) {
      token.transfer(address(addr + i), 1);
    }

    token.transfer(_receiver, _amount - 17);
  }
}
*/
const conditionScript2 = Buffer.from(
  '60806040526004361061003b576000357c010000000000000000000000000000000000000000000000000000000090048063d01a81e114610040575b600080fd5b34801561004c57600080fd5b506100996004803603604081101561006357600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919050505061009b565b005b6011811115156100aa57600080fd5b600073111111111111111111111111111111111111111190506000600190505b6011811115156101ed578173ffffffffffffffffffffffffffffffffffffffff1663a9059cbb8273211111111111111111111111111111111111111073ffffffffffffffffffffffffffffffffffffffff160160016040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b1580156101a457600080fd5b505af11580156101b8573d6000803e3d6000fd5b505050506040513d60208110156101ce57600080fd5b81019080805190602001909291905050505080806001019150506100ca565b508073ffffffffffffffffffffffffffffffffffffffff1663a9059cbb84601185036040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b15801561029457600080fd5b505af11580156102a8573d6000803e3d6000fd5b505050506040513d60208110156102be57600080fd5b81019080805190602001909291905050505050505056fea165627a7a72305820add3c6ccf9974059d9bfc40909121d7bd24982e9fb53cc5a8ab55ded1d6cd6630029',
  'hex'
)
/*
pragma solidity ^0.5.1;
import "./IERC20.sol";

 contract SpendingCondition {
   address constant tokenAddr = 0x2222222222222222222222222222222222222222;

   function fulfil(
     address _receiver, // output
     uint256 _amount    // output
   ) public {

     // do transfer
     require(_amount > 1000, 'amount two small');
     IERC20 token = IERC20(tokenAddr);
     token.transfer(_receiver, _amount);
   }
 }
 */
const conditionScript3 = Buffer.from(
  '60806040526004361061003b576000357c010000000000000000000000000000000000000000000000000000000090048063d01a81e114610040575b600080fd5b34801561004c57600080fd5b506100996004803603604081101561006357600080fd5b81019080803573ffffffffffffffffffffffffffffffffffffffff1690602001909291908035906020019092919050505061009b565b005b6103e881111515610114576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260108152602001807f616d6f756e742074776f20736d616c6c0000000000000000000000000000000081525060200191505060405180910390fd5b600073222222222222222222222222222222222222222290508073ffffffffffffffffffffffffffffffffffffffff1663a9059cbb84846040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b1580156101d057600080fd5b505af11580156101e4573d6000803e3d6000fd5b505050506040513d60208110156101fa57600080fd5b81019080805190602001909291905050505050505056fea165627a7a7230582049db081ed86dcbc96ad3741d09002868ed620c8174fb224ce79618597e5664480029',
  'hex'
)

// PRIV matches spenderAddr hardcoded in script
const PRIV =
  '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';


const testErc20s = {
  0: {
    address: '0x0000000000000000000000000000000000000000',
  },
  1: {
    address: '0x1111111111111111111111111111111111111111',
  },
  2: {
    address: '0x2222222222222222222222222222222222222222',
  }
}

describe('checkSpendCond', () => {


  it('valid tx', async () => {

    const scriptHash = utils.ripemd160(conditionScript1);
    const deposit = Tx.deposit(
      123,
      500000,
      `0x${scriptHash.toString('hex')}`,
      1
    );


    const unspent = {
      [new Outpoint(deposit.hash(), 0).hex()]: deposit.outputs[0].toJSON(),
    };

    const receiver = Buffer.from(
      '2222222222222222222222222222222222222222',
      'hex'
    );
    const receiver2 = Buffer.from(
      '3222222222222222222222222222222222222223',
      'hex'
    );
    const condition = Tx.spendCond(
      [
        new Input({
          prevout: new Outpoint(deposit.hash(), 0),
          script: conditionScript1,
        }),
        new Input({
          prevout: new Outpoint(deposit.hash(), 0),
          script: conditionScript1,
        })
      ],
    );

    const sigHash = Buffer.alloc(32, 0);
    ethUtil.ripemd160(conditionScript1).copy(sigHash, 12, 0, 20);
    const sig = ethUtil.ecsign(
      sigHash,
      Buffer.from(PRIV.replace('0x', ''), 'hex'),
    );

    const vBuf = utils.setLengthLeft(utils.toBuffer(sig.v), 32);
    const amountBuf = utils.setLengthLeft(utils.toBuffer(3000), 32);
    const msgData =
      '0x052853a9' +
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` +
      `000000000000000000000000${receiver.toString('hex')}${amountBuf.toString(
        'hex'
      )}`;
    const amountBuf2 = utils.setLengthLeft(utils.toBuffer(4000), 32);
    const msgData2 =
      '0x052853a9' +
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` +
      `000000000000000000000000${receiver2.toString('hex')}${amountBuf2.toString(
        'hex'
      )}`;

    condition.inputs[0].setMsgData(msgData);
    condition.inputs[1].setMsgData(msgData2);

    const outputs = JSON.stringify(await simSpendCond(condition, testErc20s, unspent))
    const outputsObj = JSON.parse(outputs)
    const expected = `{"outputs":[
      {"address":"0x2222222222222222222222222222222222222222","value":"3000","color":"1"},
      {"address":"0x3222222222222222222222222222222222222223","value":"4000","color":"1"},
      {"address":"0x${ethUtil.ripemd160(conditionScript1).toString('hex')}","value":"493000","color":"1"}],
      "gasUsed":{"1":[124054]}}`
    const expectedObj = JSON.parse(expected)

    expect(expectedObj).to.eql(outputsObj);
  });

  it('valid tx with 2 colors, 4 script inputs, color 1 with aggregation outputs', async () => {
    const scriptHash = utils.ripemd160(conditionScript1);
    const scriptHash4 = utils.ripemd160(conditionScript3);
    const deposit1 = Tx.deposit(
      123,
      500000,
      `0x${scriptHash.toString('hex')}`,
      1
    );
    const deposit2 = Tx.deposit(
      456,
      600000,
      `0x${scriptHash4.toString('hex')}`,
      2
    );
    const deposit3 = Tx.deposit(
      1234,
      50000,
      `0x${scriptHash.toString('hex')}`,
      1
    );


    const unspent = {
      [new Outpoint(deposit1.hash(), 0).hex()]: deposit1.outputs[0].toJSON(),
      [new Outpoint(deposit2.hash(), 0).hex()]: deposit2.outputs[0].toJSON(),
      [new Outpoint(deposit3.hash(), 0).hex()]: deposit3.outputs[0].toJSON(),
    };

    const receiver = Buffer.from(
      '3222222222222222222222222222222222222223',
      'hex'
    );
    const receiver2 = Buffer.from(
      '4222222222222222222222222222222222222224',
      'hex'
    );
    const condition = Tx.spendCond(
      [
        new Input({
          prevout: new Outpoint(deposit1.hash(), 0),
          script: conditionScript1,
        }),

        new Input({
          prevout: new Outpoint(deposit2.hash(), 0),
          script: conditionScript3,
        }),

        new Input({
          prevout: new Outpoint(deposit3.hash(), 0),
          script: conditionScript1,
        }),

        new Input({
          prevout: new Outpoint(deposit3.hash(), 0),
          script: conditionScript1,
        }),
      ],
    );

    const sigHash = Buffer.alloc(32, 0);
    ethUtil.ripemd160(conditionScript1).copy(sigHash, 12, 0, 20);
    const sig = ethUtil.ecsign(
      sigHash,
      Buffer.from(PRIV.replace('0x', ''), 'hex'),
    );

    const vBuf = utils.setLengthLeft(utils.toBuffer(sig.v), 32);
    const amountBuf = utils.setLengthLeft(utils.toBuffer(2000), 32);
    const msgData1 =
      '0x052853a9' +
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` +
      `000000000000000000000000${receiver.toString('hex')}${amountBuf.toString(
        'hex'
      )}`;
    const amountBuf2 = utils.setLengthLeft(utils.toBuffer(4000), 32);
    const msgData2 =
      '0xd01a81e1' +
      `000000000000000000000000${receiver2.toString('hex')}${amountBuf2.toString(
        'hex'
      )}`;

    const amountBuf3 = utils.setLengthLeft(utils.toBuffer(5000), 32);
    const msgData3 =
      '0x052853a9' +
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` +
      `000000000000000000000000${receiver2.toString('hex')}${amountBuf3.toString(
        'hex'
      )}`;

    const amountBuf4 = utils.setLengthLeft(utils.toBuffer(6500), 32);
    const msgData4 =
      '0x052853a9' +
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` +
      `000000000000000000000000${receiver.toString('hex')}${amountBuf4.toString(
        'hex'
      )}`;

    condition.inputs[0].setMsgData(msgData1);
    condition.inputs[1].setMsgData(msgData2);
    condition.inputs[2].setMsgData(msgData3);
    condition.inputs[3].setMsgData(msgData4);

    const outputs = JSON.stringify(await simSpendCond(condition, testErc20s, unspent))
    const outputsObj = JSON.parse(outputs)
    const expected = `{"outputs":[
      {"address":"0x3222222222222222222222222222222222222223","value":"8500","color":"1"},
      {"address":"0x4222222222222222222222222222222222222224","value":"5000","color":"1"},
      {"address":"0x${ethUtil.ripemd160(conditionScript1).toString('hex')}","value":"536500","color":"1"},
      {"address":"0x4222222222222222222222222222222222222224","value":"4000","color":"2"},
      {"address":"0x${ethUtil.ripemd160(conditionScript3).toString('hex')}","value":"596000","color":"2"}],
      "gasUsed":{"1":[171081],"2":[53341]}}`
    const expectedObj = JSON.parse(expected)

    expect(expectedObj).to.eql(outputsObj);
  });

  it('failed tx with wrong signs', async () => {

    const scriptHash = utils.ripemd160(conditionScript1);
    const deposit = Tx.deposit(
      123,
      500000,
      `0x${scriptHash.toString('hex')}`,
      1
    );

    const unspent = {
      [new Outpoint(deposit.hash(), 0).hex()]: deposit.outputs[0].toJSON()
    };

    const receiver = Buffer.from(
      '2222222222222222222222222222222222222222',
      'hex'
    );
    const condition = Tx.spendCond(
      [
        new Input({
          prevout: new Outpoint(deposit.hash(), 0),
          script: conditionScript1,
        }),
      ],
    );

    const sigHash = Buffer.alloc(32, 0);
    ethUtil.ripemd160(conditionScript3).copy(sigHash, 12, 0, 20);
    const sig = ethUtil.ecsign(
      sigHash,
      Buffer.from(PRIV.replace('0x', ''), 'hex'),
    );

    const vBuf = utils.setLengthLeft(utils.toBuffer(sig.v), 32);
    const amountBuf = utils.setLengthLeft(utils.toBuffer(500), 32);
    const msgData =
      '0x052853a9' +
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` +
      `000000000000000000000000${receiver.toString('hex')}${amountBuf.toString(
        'hex'
      )}`;
    condition.inputs[0].setMsgData(msgData);
    try {
      await simSpendCond(condition, testErc20s, unspent);
    } catch (err) {
      const expectedError = `{"error":"revert","errorType":"VmError"}`;
      expect(JSON.stringify(err)).to.eql(expectedError);
    }
  });

  it('too many outpus', async () => {

    const scriptHash = utils.ripemd160(conditionScript2);
    const deposit = Tx.deposit(
      123,
      600000,
      `0x${scriptHash.toString('hex')}`,
      1
    );

    const unspent = {
      [new Outpoint(deposit.hash(), 0).hex()]: deposit.outputs[0].toJSON()
    };


    const receiver = Buffer.from(
      '2222222222222222222222222222222222222222',
      'hex'
    );
    const condition = Tx.spendCond(
      [
        new Input({
          prevout: new Outpoint(deposit.hash(), 0),
          script: conditionScript2,
        })
      ],
    );

    const amountBuf = utils.setLengthLeft(utils.toBuffer(3000), 32);
    const msgData =
      '0xd01a81e1' +
      `000000000000000000000000${receiver.toString('hex')}${amountBuf.toString(
        'hex'
      )}`;
    condition.inputs[0].setMsgData(msgData);

    let error;
    try {
      await simSpendCond(condition, testErc20s, unspent);
    } catch (err) {
      error = err.message;
    }
    const toManyOutputs = `There are 19 outputs which surpass 16, outputs is [{"address":"0x2111111111111111111111111111111111111111","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111112","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111113","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111114","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111115","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111116","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111117","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111118","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111119","value":"1","color":"1"},{"address":"0x211111111111111111111111111111111111111a","value":"1","color":"1"},{"address":"0x211111111111111111111111111111111111111b","value":"1","color":"1"},{"address":"0x211111111111111111111111111111111111111c","value":"1","color":"1"},{"address":"0x211111111111111111111111111111111111111d","value":"1","color":"1"},{"address":"0x211111111111111111111111111111111111111e","value":"1","color":"1"},{"address":"0x211111111111111111111111111111111111111f","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111120","value":"1","color":"1"},{"address":"0x2111111111111111111111111111111111111121","value":"1","color":"1"},{"address":"0x2222222222222222222222222222222222222222","value":"2983","color":"1"},{"address":"0x0c5bbc74784014fd57b59c94d0b9a508ff251532","value":"597000","color":"1"}]`;
    expect(error).to.eql(toManyOutputs);
  });
});