import { expect } from 'chai';
import Tx from './transaction'
import Outpoint from './outpoint';
import Input from './input'

const utils = require('ethereumjs-util');
const simSpendCond = require('./simulateSpendCondTxLocally');

// a script exists that can only be spent by spenderAddr defined in script
//
// pragma solidity ^0.5.2;
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
//     uint256 diff = token.balanceOf(address(this)) - _amount;
//     token.transfer(_receiver, _amount);
//     if (diff > 0) {
//       token.transfer(signer, diff);
//     }
//   }
// }

const conditionScript = Buffer.from(
  '60806040526004361061003b576000357c010000000000000000000000000000000000000000000000000000000090048063052853a914610040575b600080fd5b34801561004c57600080fd5b506100ba600480360360a081101561006357600080fd5b810190808035906020019092919080359060200190929190803560ff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291905050506100bc565b005b600060016060306c01000000000000000000000000026bffffffffffffffffffffffff1916908060020a820491505085888860405160008152602001604052604051808581526020018460ff1660ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa158015610145573d6000803e3d6000fd5b505050602060405103519050600073111111111111111111111111111111111111111190508073ffffffffffffffffffffffffffffffffffffffff1663a9059cbb85856040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b15801561020d57600080fd5b505af1158015610221573d6000803e3d6000fd5b505050506040513d602081101561023757600080fd5b8101908080519060200190929190505050505050505050505056fea165627a7a72305820648438cace5e22e01990ff387b8b28f34d7b9ef32b67f315de245d166c66318c0029',

  'hex'
);

// a script which generate 18 token transfers
/*
pragma solidity ^0.5.1;
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract SpendingCondition {
  address constant tokenAddr = 0x1111111111111111111111111111111111111111;
  address constant spenderAddr = 0xF3beAC30C498D9E26865F34fCAa57dBB935b0D74;
  uint160 constant addr = uint160(0x2111111111111111111111111111111111111110);


  function fulfil(
    bytes32 _r,        // signature
    bytes32 _s,        // signature
    uint8 _v,          // signature
    address _receiver, // output
    uint256 _amount    // output
  ) public {
    // check signature
   // address signer = ecrecover(bytes32(bytes20(address(this))), _v, _r, _s);
    //require(signer == spenderAddr);
    IERC20 token = IERC20(tokenAddr);
    if (_amount > 17) {
      for (uint i = 1; i <= 17; i++) {
        token.transfer(address(addr + i), 1);
      }
    }
    token.transfer(_receiver, _amount - 17);
  }
}
*/
const conditionScript2 = Buffer.from(
  '60806040526004361061003b576000357c010000000000000000000000000000000000000000000000000000000090048063052853a914610040575b600080fd5b34801561004c57600080fd5b506100ba600480360360a081101561006357600080fd5b810190808035906020019092919080359060200190929190803560ff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291905050506100bc565b005b60007311111111111111111111111111111111111111119050601182111561020a576000600190505b601181111515610208578173ffffffffffffffffffffffffffffffffffffffff1663a9059cbb8273211111111111111111111111111111111111111073ffffffffffffffffffffffffffffffffffffffff160160016040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b1580156101bf57600080fd5b505af11580156101d3573d6000803e3d6000fd5b505050506040513d60208110156101e957600080fd5b81019080805190602001909291905050505080806001019150506100e5565b505b8073ffffffffffffffffffffffffffffffffffffffff1663a9059cbb84601185036040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b1580156102b057600080fd5b505af11580156102c4573d6000803e3d6000fd5b505050506040513d60208110156102da57600080fd5b81019080805190602001909291905050505050505050505056fea165627a7a72305820d939dd3d69c7d3d5ff1110f1af76e6ffc8ec90638645983266022ca17da537750029',
  'hex'
)

// a script exists that can only be spent by spenderAddr defined in script
//
// pragma solidity ^0.5.1;
// import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

// contract SpendingCondition {
//   address constant tokenAddr = 0x2222222222222222222222222222222222222222;
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
//     uint256 diff = token.balanceOf(address(this)) - _amount;
//     token.transfer(_receiver, _amount);
//     if (diff > 0) {
//       token.transfer(signer, diff);
//     }
//   }
// }
const conditionScript3 = Buffer.from(
'60806040526004361061003b576000357c010000000000000000000000000000000000000000000000000000000090048063052853a914610040575b600080fd5b34801561004c57600080fd5b506100ba600480360360a081101561006357600080fd5b810190808035906020019092919080359060200190929190803560ff169060200190929190803573ffffffffffffffffffffffffffffffffffffffff169060200190929190803590602001909291905050506100bc565b005b600060016060306c01000000000000000000000000026bffffffffffffffffffffffff1916908060020a820491505085888860405160008152602001604052604051808581526020018460ff1660ff1681526020018381526020018281526020019450505050506020604051602081039080840390855afa158015610145573d6000803e3d6000fd5b505050602060405103519050600073222222222222222222222222222222222222222290506000838273ffffffffffffffffffffffffffffffffffffffff166370a08231306040518263ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060206040518083038186803b15801561020657600080fd5b505afa15801561021a573d6000803e3d6000fd5b505050506040513d602081101561023057600080fd5b81019080805190602001909291905050500390508173ffffffffffffffffffffffffffffffffffffffff1663a9059cbb86866040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b1580156102e757600080fd5b505af11580156102fb573d6000803e3d6000fd5b505050506040513d602081101561031157600080fd5b810190808051906020019092919050505050600081111561040c578173ffffffffffffffffffffffffffffffffffffffff1663a9059cbb84836040518363ffffffff167c0100000000000000000000000000000000000000000000000000000000028152600401808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200182815260200192505050602060405180830381600087803b1580156103cf57600080fd5b505af11580156103e3573d6000803e3d6000fd5b505050506040513d60208110156103f957600080fd5b8101908080519060200190929190505050505b505050505050505056fea165627a7a723058202b056e375896c9262e5b85b5c7f7c3820592a092cd13bd3c1d8f525b2aa522cb0029',
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

  it('valid tx with 2 colors', async () => {
    const scriptHash = utils.ripemd160(conditionScript);
    const scriptHash2 = utils.ripemd160(conditionScript3);
    const deposit1 = Tx.deposit(
      123,
      500000,
      `0x${scriptHash.toString('hex')}`,
      1
    );
    const deposit2 = Tx.deposit(
      456,
      600000,
      `0x${scriptHash2.toString('hex')}`,
      2
    );
    const deposit3 = Tx.deposit(
      1234,
      50000,
      `0x${scriptHash.toString('hex')}`,
      1
    );

    const state = {
      unspent: {
        [new Outpoint(deposit1.hash(), 0).hex()]: deposit1.outputs[0].toJSON(),
        [new Outpoint(deposit2.hash(), 0).hex()]: deposit2.outputs[0].toJSON(),
        [new Outpoint(deposit3.hash(), 0).hex()]: deposit3.outputs[0].toJSON(),
      },
      gas: {
        minPrice: 0,
      },
    };

    // a spending condition transaction that spends the deposit is created
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
          prevout: new Outpoint(deposit2.hash(), 0),
          script: conditionScript3,
        }),
        new Input({
          prevout: new Outpoint(deposit1.hash(), 0),
          script: conditionScript,
        }),
        new Input({
          prevout: new Outpoint(deposit3.hash(), 0),
          script: conditionScript,
        }),
      ],
    );

    const sig = condition.getConditionSig(PRIV);

    // msgData that satisfies the spending condition
    const vBuf = utils.setLengthLeft(utils.toBuffer(sig.v), 32);
    const amountBuf = utils.setLengthLeft(utils.toBuffer(3000), 32);
    const msgData =
      '0x052853a9' + // function called
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` + // signature
      `000000000000000000000000${receiver.toString('hex')}${amountBuf.toString(
        'hex'
      )}`; // outputs
    const amountBuf2 = utils.setLengthLeft(utils.toBuffer(4000), 32);
    const msgData2 =
      '0x052853a9' + // function called
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` + // signature
      `000000000000000000000000${receiver2.toString('hex')}${amountBuf2.toString(
        'hex'
      )}`; // outputs

      const amountBuf3 = utils.setLengthLeft(utils.toBuffer(5000), 32);
      const msgData3 =
        '0x052853a9' + // function called
        `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
          'hex'
        )}` + // signature
        `000000000000000000000000${receiver2.toString('hex')}${amountBuf3.toString(
          'hex'
        )}`; // outputs

    condition.inputs[0].setMsgData(msgData);
    condition.inputs[1].setMsgData(msgData2);
    condition.inputs[2].setMsgData(msgData3);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(await simSpendCond(condition, testErc20s, state)));
  });

  
  it('valid tx', async () => {
    // a depsoit to the above script tas been done
    const scriptHash = utils.ripemd160(conditionScript);
    const deposit = Tx.deposit(
      123,
      500000,
      `0x${scriptHash.toString('hex')}`,
      1
    );

    const state = {
      unspent: {
        [new Outpoint(deposit.hash(), 0).hex()]: deposit.outputs[0].toJSON(),
      },
      gas: {
        minPrice: 0,
      },
    };

    // a spending condition transaction that spends the deposit is created
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
          script: conditionScript,
        }),
        new Input({
          prevout: new Outpoint(deposit.hash(), 0),
          script: conditionScript,
        })
      ],
    );

    const sig = condition.getConditionSig(PRIV);

    // msgData that satisfies the spending condition
    const vBuf = utils.setLengthLeft(utils.toBuffer(sig.v), 32);
    const amountBuf = utils.setLengthLeft(utils.toBuffer(3000), 32);
    const msgData =
      '0x052853a9' + // function called
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` + // signature
      `000000000000000000000000${receiver.toString('hex')}${amountBuf.toString(
        'hex'
      )}`; // outputs
    const amountBuf2 = utils.setLengthLeft(utils.toBuffer(4000), 32);
    const msgData2 =
      '0x052853a9' + // function called
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` + // signature
      `000000000000000000000000${receiver2.toString('hex')}${amountBuf2.toString(
        'hex'
      )}`; // outputs

    condition.inputs[0].setMsgData(msgData);
    condition.inputs[1].setMsgData(msgData2);
    console.log(await simSpendCond(condition, testErc20s, state));
  });

  it('too many outpus', async () => {
    // a depsoit to the above script tas been done
    const scriptHash = utils.ripemd160(conditionScript2);
    const deposit = Tx.deposit(
      123,
      600000,
      `0x${scriptHash.toString('hex')}`,
      1
    );

    const state = {
      unspent: {
        [new Outpoint(deposit.hash(), 0).hex()]: deposit.outputs[0].toJSON(),
      },
      gas: {
        minPrice: 0,
      },
    };

    // a spending condition transaction that spends the deposit is created
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

    const sig = condition.getConditionSig(PRIV);

    // msgData that satisfies the spending condition
    const vBuf = utils.setLengthLeft(utils.toBuffer(sig.v), 32);
    const amountBuf = utils.setLengthLeft(utils.toBuffer(3000), 32);
    const msgData =
      '0x052853a9' + // function called
      `${sig.r.toString('hex')}${sig.s.toString('hex')}${vBuf.toString(
        'hex'
      )}` + // signature
      `000000000000000000000000${receiver.toString('hex')}${amountBuf.toString(
        'hex'
      )}`; // outputs
    condition.inputs[0].setMsgData(msgData);

    let error;
    try {
      await simSpendCond(condition, testErc20s, state);
    } catch (err) {
      error = err.message;
    }
    const  toManyOutputs = `There are 18 outputs which surpass 16, outputs is [{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111111","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111112","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111113","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111114","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111115","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111116","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111117","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111118","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111119","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x211111111111111111111111111111111111111a","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x211111111111111111111111111111111111111b","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x211111111111111111111111111111111111111c","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x211111111111111111111111111111111111111d","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x211111111111111111111111111111111111111e","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x211111111111111111111111111111111111111f","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111120","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2111111111111111111111111111111111111121","color":1,"amount":[1]},{"from":"0x5a9032dbf63ab51623246f523bb0633d65334056","to":"0x2222222222222222222222222222222222222222","color":1,"amount":[2983]}]`;
    expect(error).to.eql(toManyOutputs);
    // eslint-disable-next-line no-console
    console.log (error)
  });
});