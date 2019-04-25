import { expect, assert } from 'chai';
import ethUtil from 'ethereumjs-util';
import { BigInt } from 'jsbi-utils';
import Web3 from '../test/helpers/web3';

import Tx from './transaction';
import Type from './type';

import Input from './input';
import Output from './output';
import Outpoint from './outpoint';

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';
const PRIV2 = '0x9b98e00378b1fac55056921cae126d42c4a8f263f582a67675298fb95a22214f';
const ADDR2 = '0x16530effa38d23fd030971b9ab809fc235b8959d';

const web3 = Web3([ADDR], [PRIV]);

describe('transactions', () => {
  it('should allow to create and parse deposit tx.', () => {
    const depositHash = '0x9ab935335a378f6b0d6611c17d811fc5ce5f7f43c65a70c3c81775e6ab6876e5';
    const value = BigInt('99000000');
    const depositId = 12;
    const color = 1337;
    const deposit = Tx.deposit(depositId, value, ADDR, color);
    // test hashing
    expect(deposit.hash()).to.eql(depositHash);
    // test parse
    assert.deepEqual(Tx.fromRaw(deposit.toRaw()), deposit);
  });

  it('should allow to create and parse exit tx.', () => {
    const prevTxHash = '0x0df38bc2ecfc9d2dab65e3d9f59c188e85f034c9289af4dfca5d506ad94db73e';
    const outputIndex = 1;
    const exit = Tx.exit(new Input(new Outpoint(prevTxHash, outputIndex)));
    // test hashing
    expect(exit.hash()).to.eql('0x10871b8aa1b148bfae3a6445aa95ac199a2b123ece3868a2041991ffbbb3e032');
    // test parse
    const exitHex = '0x070df38bc2ecfc9d2dab65e3d9f59c188e85f034c9289af4dfca5d506ad94db73e01';
    expect(exit.hex()).to.eql(exitHex);
    assert.deepEqual(Tx.fromRaw(exitHex), exit);
  });

  it('should allow to serialze and deserialize deposit tx to/from json.', () => {
    const depositHash = '0x9ab935335a378f6b0d6611c17d811fc5ce5f7f43c65a70c3c81775e6ab6876e5';
    const value = BigInt('99000000');
    const color = 1337;
    const depositId = 12;
    const deposit = Tx.deposit(depositId, value, ADDR, color);
    // toJSON
    const json = deposit.toJSON();
    expect(json).to.eql({
      type: Type.DEPOSIT,
      hash: depositHash,
      inputs: [],
      outputs: [{ address: ADDR, value: value.toString(), color }],
      options: { depositId },
    });
    // fromJSON
    assert.deepEqual(Tx.fromJSON(json), deposit);
  });

  it('should allow to create and parse transfer tx.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = BigInt('99000000');
    const color = 1337;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR, color)],
    );

    // test signing
    const transferHash = '0x53561d29cc9962a1c504a74bba096da35f431a75676242f9511ceb76e10c9861';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    assert.deepEqual(Tx.fromRaw(transfer.toRaw()), transfer);
  });

  it('should allow to create and parse epochLength tx.', () => {
    const epochLength = Tx.epochLength(10);

    assert.deepEqual(Tx.fromRaw(epochLength.hex()), epochLength);
  });

  it('should allow to create and parse minGasPrice tx.', () => {
    const minGas = Tx.minGasPrice(10);

    assert.deepEqual(Tx.fromRaw(minGas.hex()), minGas);
  });

  it('should allow to create and parse validatorJoin tx.', () => {
    const slotId = 0;
    const tenderKey = '0x7640D69D9EDB21592CBDF4CC49956EA53E59656FC2D8BBD1AE3F427BF67D47FA';
    const signerAddr = '0x7640D69D9EDB21592CBDF4CC49956EA53E59656F';
    const validatorJoin = Tx.validatorJoin(slotId, tenderKey, 10, signerAddr);

    assert.deepEqual(Tx.fromRaw(validatorJoin.hex()), validatorJoin);
  });

  it('should allow to create and parse validatorLogout tx.', () => {
    const slotId = 0;
    const tenderKey = '0x7640D69D9EDB21592CBDF4CC49956EA53E59656FC2D8BBD1AE3F427BF67D47FA';
    const newSigner = '0x7640D69D9EDB21592CBDF4CC49956EA53E59656F';
    const validatorLogout = Tx.validatorLogout(slotId, tenderKey, 10, 5, newSigner);
    assert.deepEqual(Tx.fromRaw(validatorLogout.hex()), validatorLogout);
  });

  it('should allow to create and parse periodVote tx.', () => {
    const merkleRoot = '0x7640d69d9edb21592cbdf4cc49956ea53e59656fc2d8bbd1ae3f427bf67d47fa';
    const vote = Tx.periodVote(12, new Input(new Outpoint(merkleRoot, 0)));
    vote.sign([PRIV]);
    assert.deepEqual(Tx.fromRaw(vote.hex()), vote);
    assert.deepEqual(Tx.fromRaw(vote.hex()).getSigners(), [ADDR]);
    // verify signer as follows:
    // var vote = Tx.fromRaw('0xhex')
    // vote.getSigners()[0] === signer addr
  });

  it('should allow to serialze and deserialize unsigned transfer tx to/from json.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = BigInt('99000000');
    const color = 1337;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR, color)],
    );

    const json = transfer.toJSON();
    expect(json).to.eql({
      type: Type.TRANSFER,
      inputs: [
        {
          hash: '0x7777777777777777777777777777777777777777777777777777777777777777',
          index: 0,
        },
      ],
      options: {},
      outputs: [{ address: ADDR, value: value.toString(), color }],
    });
    // fromJSON
    assert.deepEqual(Tx.fromJSON(json), transfer);
  });


  it('should allow to serialze and deserialize transfer tx to/from json.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = BigInt('99000000');
    const color = 1337;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR, color)],
    );

    // toJSON
    const transferHash = '0x53561d29cc9962a1c504a74bba096da35f431a75676242f9511ceb76e10c9861';
    transfer.sign([PRIV]);
    assert.deepEqual(transfer.getSigners(), [ADDR]);
    const json = transfer.toJSON();
    expect(json).to.eql({
      type: Type.TRANSFER,
      hash: transferHash,
      inputs: [
        {
          hash: '0x7777777777777777777777777777777777777777777777777777777777777777',
          index: 0,
        },
      ],
      options: {
        signatures: [
          '0x1c7bcc74f529b8235fa2b3069f416408bdacb9e6547b01a33971de4a1950a9250d0f50fc022404e10581ed195b7361f6a99a04e7db32ecae39f99afd3dd1c1884b',
        ]
      },
      outputs: [{ address: ADDR, value: value.toString(), color }],
    });
    // fromJSON
    assert.deepEqual(Tx.fromJSON(json), transfer);
  });


  it('should allow to create and parse transfer tx with 2 inputs.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = BigInt('99000000');
    const color = 1337;

    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value, ADDR, color)],
    );

    // test signing
    const transferHash = '0x33ff94f40f0bde0ee16265acb6387f187bc9eb04fbf32538a8ada8c87ce8a712';
    transfer.sign([PRIV, PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    assert.deepEqual(Tx.fromRaw(transfer.toRaw()), transfer);
    assert.deepEqual(Tx.fromRaw(transfer.toRaw()).getSigners(), transfer.getSigners());
  });

  it('should allow to create and parse transfer tx with 2 outputs.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = BigInt('99000000');
    const color = 1337;
    const addr2 = '0xeeffddcf42c8d1ff9594b17a3f50e94a12ccaabb';

    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value / 3, ADDR, color), new Output(value / 2, addr2, color)],
    );

    // test signing
    const transferHash = '0x81ff15f0382eaaddf951f0676197be8f1fa86b37a23e9cfca00b7bba16051f83';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    assert.deepEqual(Tx.fromRaw(transfer.toRaw()), transfer);
    assert.deepEqual(Tx.fromRaw(transfer.toRaw()).getSigners(), transfer.getSigners());
  });

  it('should calculate tx size', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = BigInt('99000000');
    const color = 1337;

    let tx = Tx.deposit(1, value, ADDR, color);
    expect(tx.getSize()).to.eq(tx.toRaw().length);

    tx = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value, ADDR, color)],
    );

    expect(tx.getSize()).to.eq(tx.toRaw().length);

    tx = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value / 2, ADDR, color), new Output(value / 2, ADDR, color)],
    );

    expect(tx.getSize()).to.eq(tx.toRaw().length);
    // input(33) + input(33) + inputLen(1) + outputLen(1) + output(54) + output(54) + sigLen(1)
    expect(tx.getSize()).to.eq(177);
    tx.sign([PRIV]);
    // plus one sig
    expect(tx.getSize()).to.eq(177 + 65);
  });

  it('should allow to create and parse spending condition tx.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = BigInt('99000000');
    const color = 1337;
    const condition = Tx.spendCond(
      [new Input({
        prevout: new Outpoint(prevTx, 0),
      })], [new Output(value, ADDR, color)],
    );
    // test sighash
    const sigData = condition.sigData();
     // msgData should not affect hashSig, as it will might cary the signature of the tx
    condition.setScript('0x123456');
    condition.setMsgData('0xabcdef');
    expect(condition.sigData()).to.eql(sigData);
    // test signing
    condition.sign([PRIV]);
    expect(condition.getSigners()).to.eql([ADDR]);
    // test hashing and parsing
    const conditionHash = '0xaa06ce6dd8ba553fecb44679c309b8c4b17ce30d3537c2411aa7485f269ce9ba';
    expect(condition.hash()).to.eql(conditionHash);
    assert.deepEqual(Tx.fromRaw(condition.toRaw()), condition);
  });

  it('should allow to create and parse spending condition with different tokens', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const NFT_COLOR_BASE = 32769; // 2^15 + 1
    const NST_COLOR_BASE = 49153; // 2^15 + 1 + 2^14
    const multiCondition = '608060405234801561001057600080fd5b506004361061002e5760e060020a60003504635bac6c1e8114610033575b600080fd5b6100656004803603606081101561004957600080fd5b5080359060208101359060400135600160a060020a0316610067565b005b6040805160e060020a63a983d43f0281526004810185905260248101849052905173333333333333333333333333333333333333333391829163a983d43f9160448082019260009290919082900301818387803b1580156100c757600080fd5b505af11580156100db573d6000803e3d6000fd5b50506040805160e060020a6323b872dd028152306004820152600160a060020a038616602482015260448101889052905173555555555555555555555555555555555555555593508392506323b872dd9160648082019260009290919082900301818387803b15801561014d57600080fd5b505af1158015610161573d6000803e3d6000fd5b50506040805160e060020a6370a082310281523060048201529051735555555555555555555555555555555555555555935083925063a9059cbb91879184916370a08231916024808301926020929190829003018186803b1580156101c557600080fd5b505afa1580156101d9573d6000803e3d6000fd5b505050506040513d60208110156101ef57600080fd5b50516040805160e060020a63ffffffff8616028152600160a060020a03909316600484015260248301919091525160448083019260209291908290030181600087803b15801561023e57600080fd5b505af1158015610252573d6000803e3d6000fd5b505050506040513d602081101561026857600080fd5b50506040805160e060020a6370a08231028152306004820152905173555555555555555555555555555555555555555591829163a9059cbb91889184916370a08231916024808301926020929190829003018186803b1580156102ca57600080fd5b505afa1580156102de573d6000803e3d6000fd5b505050506040513d60208110156102f457600080fd5b50516040805160e060020a63ffffffff8616028152600160a060020a03909316600484015260248301919091525160448083019260209291908290030181600087803b15801561034357600080fd5b505af1158015610357573d6000803e3d6000fd5b505050506040513d602081101561036d57600080fd5b50505050505050505056fea165627a7a72305820d7e59872f6aca528c464ba6ba8a6b0c3534f9d6a54b403ab31f20b610056eb2a0029';
    const script = Buffer.from(multiCondition, 'hex');
    const scriptHash = ethUtil.ripemd160(script);
    const tokenId = '0x0000000000000000000000005555555555555555555555555555555555555555';
    const tokenData = '0x00000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa00005';
    const receiver = '0x82e8C6Cf42C8D1fF9594b17A3F50e94a12cC860f'.toLowerCase();
    const gasAllowance = 6000000 * 100;

    const condition = Tx.spendCond(
      [
        new Input({
          prevout: new Outpoint(prevTx, 0),
        }),
        new Input({
          prevout: new Outpoint(prevTx, 0),
        }),
        new Input({
          prevout: new Outpoint(prevTx, 0),
        }),
        new Input({
          prevout: new Outpoint(prevTx, 0),
        }),
      ],
      [
        new Output(
          tokenId,
          `0x${receiver.replace('0x', '')}`,
          NST_COLOR_BASE,
          tokenData
        ),
        new Output(tokenId, `0x${receiver.replace('0x', '')}`, NFT_COLOR_BASE),
        new Output(
          5000000000 - gasAllowance,
          `0x${receiver.replace('0x', '')}`,
          0
        ),
        new Output(5000000000, `0x${receiver.replace('0x', '')}`, 1),
        new Output(500000, `0x${scriptHash.toString('hex')}`, 0),
      ]
    );
    const sigHash1 = condition.sigData();
    condition.setScript('0x123456');
    condition.setMsgData('0xabcdef');
    const sigHash2 = condition.sigData();
    assert.equal(sigHash1, sigHash2);

    condition.sign([PRIV]);
    assert.deepEqual(condition.getSigners(), [ADDR]);

    // test hashing and parsing
    const conditionHash = '0xbfebd7dca6ce935402c916eeaf03c19a4a1d85fdfedfb71d899c7c2439d9fc5b';
    expect(condition.hash()).to.eql(conditionHash);
    assert.deepEqual(Tx.fromJSON(condition.toJSON()), condition);
    assert.deepEqual(Tx.fromRaw(condition.toRaw()), condition);
  });

  it('should allow to serialze and deserialize condition tx to/from json.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = BigInt('99000000');
    const color = 1337;
    const condition = Tx.spendCond(
      [new Input({
        prevout: new Outpoint(prevTx, 0),
      })], [new Output(value, ADDR, color)],
    );
    condition.setScript('0x123456');
    condition.setMsgData('0xabcdef');

    // fromJSON
    assert.deepEqual(Tx.fromJSON(condition.toJSON()), condition);
  });

  it('should allow to sign with web3', async () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = BigInt('99000000');
    const color = 1337;
    const tx = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value, ADDR, color)],
    );

    await tx.signWeb3(web3, 0);

    const unserializedTx = Tx.fromRaw(tx.toRaw());

    assert.deepEqual(tx.options.signatures, unserializedTx.options.signatures);
    assert.deepEqual(unserializedTx.getSigners(), tx.getSigners());

    assert.deepEqual(unserializedTx.getSigners(), [ADDR]);
  });

  it('should construct from utxos', () => {
    const ADDR_1 = '0x4436373705394267350db2c06613990d34621d69';
    const ADDR_2 = '0x8ab21c65041778dfc7ec7995f9cdef3d5221a5ad';

    const deposit1 = Tx.deposit(1, 100, ADDR_1);
    const deposit2 = Tx.deposit(2, 200, ADDR_1);

    const utxos = [
      { output: deposit1.outputs[0], outpoint: new Outpoint(deposit1.hash(), 0) },
      { output: deposit2.outputs[0], outpoint: new Outpoint(deposit2.hash(), 0) },
    ];

    assert(Tx.transferFromUtxos(utxos, ADDR_1, ADDR_2, 100));
  })

  it('signCondition/getConditionSigners should work as expected', () => {
    const condition = Tx.spendCond(
      [new Input({
        prevout: new Outpoint('0x7777777777777777777777777777777777777777777777777777777777777777', 0),
      })], [new Output(BigInt('111111'), ADDR, 0)],
    );
    condition.setScript('0x123456');
    condition.setMsgData('0xabcdef');
    condition.sign([PRIV, PRIV2]);

    const signers = condition.getSigners();

    assert.deepEqual(
      signers,
      [
        ADDR,
        ADDR2,
      ]
    );

    const json = condition.toJSON();
    const obj = Tx.fromJSON(json);
    assert.deepEqual(condition, obj);
    const raw = condition.toRaw();
    assert.deepEqual(condition, Tx.fromRaw(raw));
    assert.deepEqual(Tx.fromRaw(raw).getSigners(), [ADDR, ADDR2]);
  });
});
