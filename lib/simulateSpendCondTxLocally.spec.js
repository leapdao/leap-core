const utils = require('ethereumjs-util');

import Tx from './transaction'
import Outpoint from './outpoint';
import Input from './input'
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
  '608060405234801561001057600080fd5b5060043610610047577c01000000000000000000000000000000000000000000000000000000006000350463052853a9811461004c575b600080fd5b61009a600480360360a081101561006257600080fd5b5080359060208101359060ff6040820135169073ffffffffffffffffffffffffffffffffffffffff606082013516906080013561009c565b005b60408051600080825260208083018085526c010000000000000000000000006bffffffffffffffffffffffff193082021604905260ff87168385015260608301899052608083018890529251909260019260a080820193601f1981019281900390910190855afa158015610114573d6000803e3d6000fd5b5050604051601f19015191505073ffffffffffffffffffffffffffffffffffffffff81167382e8c6cf42c8d1ff9594b17a3f50e94a12cc860f1461015757600080fd5b604080517f70a08231000000000000000000000000000000000000000000000000000000008152306004820152905173111111111111111111111111111111111111111191600091859184916370a0823191602480820192602092909190829003018186803b1580156101c957600080fd5b505afa1580156101dd573d6000803e3d6000fd5b505050506040513d60208110156101f357600080fd5b5051604080517fa9059cbb00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff898116600483015260248201899052915193909203935084169163a9059cbb916044808201926020929091908290030181600087803b15801561027357600080fd5b505af1158015610287573d6000803e3d6000fd5b505050506040513d602081101561029d57600080fd5b5050600081111561034a57604080517fa9059cbb00000000000000000000000000000000000000000000000000000000815230600482015260248101839052905173ffffffffffffffffffffffffffffffffffffffff84169163a9059cbb9160448083019260209291908290030181600087803b15801561031d57600080fd5b505af1158015610331573d6000803e3d6000fd5b505050506040513d602081101561034757600080fd5b50505b505050505050505056fea165627a7a72305820e9428f6a563bc6943b4ced90c2be537e90ee8bffea1498ae74c032a3f66f5baa0029',

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

// PRIV matches spenderAddr hardcoded in script
const PRIV =
  '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';

// commpiled https://github.com/leapdao/spending-conditions/blob/master/contracts/ERC20Min.sol
const erc20Code = Buffer.from(
  '608060405234801561001057600080fd5b506004361061005d577c0100000000000000000000000000000000000000000000000000000000600035046340c10f19811461006257806370a08231146100a2578063a9059cbb146100da575b600080fd5b61008e6004803603604081101561007857600080fd5b50600160a060020a038135169060200135610106565b604080519115158252519081900360200190f35b6100c8600480360360208110156100b857600080fd5b5035600160a060020a0316610128565b60408051918252519081900360200190f35b61008e600480360360408110156100f057600080fd5b50600160a060020a038135169060200135610143565b60006001331461011557600080fd5b61011f8383610150565b50600192915050565b600160a060020a031660009081526020819052604090205490565b600061011f3384846101e4565b600160a060020a038216151561016557600080fd5b600160a060020a03821660009081526020819052604090205461018e908263ffffffff6102b116565b600160a060020a0383166000818152602081815260408083209490945583518581529351929391927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9281900390910190a35050565b600160a060020a03821615156101f957600080fd5b600160a060020a038316600090815260208190526040902054610222908263ffffffff6102ca16565b600160a060020a038085166000908152602081905260408082209390935590841681522054610257908263ffffffff6102b116565b600160a060020a038084166000818152602081815260409182902094909455805185815290519193928716927fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef92918290030190a3505050565b6000828201838110156102c357600080fd5b9392505050565b6000828211156102d957600080fd5b5090039056fea165627a7a72305820b48eed6297042d728d0fddfa2756bf34e6a1faa2965516c2d03dbfc53e01065d0029',
  'hex'
);

const testErc20s = {
  0: {
    address: '0000000000000000000000000000000000000000',
    erc20code: erc20Code
  },
  1: {
    address: '1111111111111111111111111111111111111111',
    erc20code: erc20Code
  },
  2: {
    address: '2111111111111111111111111111111111111112',
    erc20code: erc20Code
  }
}

describe('checkSpendCond', () => {

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
    const  toManyOutputs = `There are 18 outputs which surpass 16, outputs is [{"address":"0x2111111111111111111111111111111111111111","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111112","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111113","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111114","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111115","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111116","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111117","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111118","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111119","value":"1","color":1},{"address":"0x211111111111111111111111111111111111111a","value":"1","color":1},{"address":"0x211111111111111111111111111111111111111b","value":"1","color":1},{"address":"0x211111111111111111111111111111111111111c","value":"1","color":1},{"address":"0x211111111111111111111111111111111111111d","value":"1","color":1},{"address":"0x211111111111111111111111111111111111111e","value":"1","color":1},{"address":"0x211111111111111111111111111111111111111f","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111120","value":"1","color":1},{"address":"0x2111111111111111111111111111111111111121","value":"1","color":1},{"address":"0x2222222222222222222222222222222222222222","value":"2983","color":1}]`;
    expect(error).to.eql(toManyOutputs);
    console.log (error)
  });
});