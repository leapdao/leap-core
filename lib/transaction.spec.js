import { expect, assert } from 'chai';
import Web3 from '../test/helpers/web3';

import Tx from './transaction';
import Type from './type';

import Input from './input';
import Output from './output';
import Outpoint from './outpoint';

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

const web3 = Web3([ADDR], [PRIV]);

describe('transactions', () => {
  it('should allow to create and parse deposit tx.', () => {
    const depositHash = '0x9ab935335a378f6b0d6611c17d811fc5ce5f7f43c65a70c3c81775e6ab6876e5';
    const value = 99000000;
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
    const value = 99000000;
    const color = 1337;
    const depositId = 12;
    const deposit = Tx.deposit(depositId, value, ADDR, color);
    // toJSON
    const json = deposit.toJSON();
    expect(json).to.eql({
      type: Type.DEPOSIT,
      hash: depositHash,
      inputs: [],
      outputs: [{ address: ADDR, value, color }],
      options: { depositId },
    });
    // fromJSON
    assert.deepEqual(Tx.fromJSON(json), deposit);
  });

  it('should allow to create and parse transfer tx.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR, color)],
    );

    // test signing
    const transferHash = '0x3342fc20b1a6b66a964d58e4f56ec38c3421964237b41853a603e1abd0b7885d';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    assert.deepEqual(Tx.fromRaw(transfer.toRaw()), transfer);
  });

  it('should allow to create and parse consolidate tx.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const consolidate = Tx.consolidate([
      new Input(new Outpoint(prevTx, 0)),
      new Input(new Outpoint(prevTx, 1)),
    ],
      new Output(value, ADDR, color),
    );
    assert.deepEqual(Tx.fromRaw(consolidate.toRaw()), consolidate);
  });

  it('should fail on consolidate with wrong output type', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    try {
      const consolidate = Tx.consolidate([
        new Input(new Outpoint(prevTx, 0)),
        new Input(new Outpoint(prevTx, 1)),
      ],
        [new Output(value, ADDR, color)],
      );
      assert(false);
    } catch(e) {
      assert(true);
    }
  });

  it('should allow to create and parse epochLength tx.', () => {
    const epochLength = Tx.epochLength(10);

    assert.deepEqual(Tx.fromRaw(epochLength.hex()), epochLength);
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
    // verify signer as follows:
    // var vote = Tx.fromRaw('0xhex')
    // vote.inputs[0].signer
  });

  it('should allow to serialze and deserialize transfer tx to/from json.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR, color)],
    );

    // toJSON
    const transferHash = '0x3342fc20b1a6b66a964d58e4f56ec38c3421964237b41853a603e1abd0b7885d';
    transfer.sign([PRIV]);
    const json = transfer.toJSON();
    expect(json).to.eql({
      type: Type.TRANSFER,
      hash: transferHash,
      inputs: [
        {
          hash: '0x7777777777777777777777777777777777777777777777777777777777777777',
          index: 0,
          r: '0xebc32d1cbe79bb0deedaa8da69907851546a0c6d9d64539d80e61c50a672c2b5',
          s: '0x34c7e587070960150775496e03074f7675c500784d212e744aeab0c113b62e8c',
          signer: '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
          v: 28,
        },
      ],
      outputs: [{ address: ADDR, value, color }],
    });
    // fromJSON
    assert.deepEqual(Tx.fromJSON(json), transfer);
  });

  it('should allow to serialze and deserialize consolidate tx to/from json.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const prevTx2 = '0x7777777777777777777777777777777777777777777777777777777777777771';
    const value = 99000000;
    const color = 1337;
    const consolidate = Tx.consolidate(
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx2, 0))],
      new Output(value, ADDR, color),
    );

    // toJSON
    const consolidateHash = consolidate.hash();
    const json = consolidate.toJSON();
    expect(json).to.eql({
      type: Type.CONSOLIDATE,
      hash: consolidateHash,
      inputs: [
        {
          hash: '0x7777777777777777777777777777777777777777777777777777777777777777',
          index: 0,
          type: Type.CONSOLIDATE,
        },
        {
          hash: '0x7777777777777777777777777777777777777777777777777777777777777771',
          index: 0,
          type: Type.CONSOLIDATE,
        },
      ],
      outputs: [{ address: ADDR, value, color }],
    });
    // fromJSON
    assert.deepEqual(Tx.fromJSON(json), consolidate);
  });

  it('should allow to create and parse transfer tx with 2 inputs.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;

    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value, ADDR, color)],
    );

    // test signing
    const transferHash = '0x8e1c367f07edb7c2c58571ebe5af679a5c056db00cda9a9c96356fcb6541db19';
    transfer.sign([PRIV, PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    assert.deepEqual(Tx.fromRaw(transfer.toRaw()), transfer);
  });

  it('should allow to create and parse transfer tx with 2 outputs.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const addr2 = '0xeeffddcf42c8d1ff9594b17a3f50e94a12ccaabb';

    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value / 3, ADDR, color), new Output(value / 2, addr2, color)],
    );

    // test signing
    const transferHash = '0xd369b48a18fec525b18b2c27d93d42d388a90946fd33c54861c12cd23c6a39f9';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    assert.deepEqual(Tx.fromRaw(transfer.toRaw()), transfer);
  });

  it('should calculate tx size', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
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
    expect(tx.getSize()).to.eq(306);
  });

  it('should allow to create and parse spending condition tx.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const condition = Tx.spendCond(
      [new Input({
        prevout: new Outpoint(prevTx, 0),
        gasPrice: 12345,
        script: '0x123456',
      })], [new Output(value, ADDR, color)],
    );
    // test sighash
    const sigHash = condition.sigHash();
     // msgData should not affect hashSig, as it will might cary the signature of the tx
    condition.inputs[0].setMsgData('0xabcdef');
    expect(condition.sigHash()).to.eql(sigHash);
    // test signing
    const sig = condition.getConditionSig(PRIV);
    const sigHashBuf = Buffer.alloc(32, 0);
    condition.sigHashBuf().copy(sigHashBuf, 12, 0, 20);
    const signer = Input.recoverSignerAddress(sigHashBuf, sig.v, sig.r, sig.s);
    expect(signer).to.eql(ADDR);
    // test hashing and parsing
    const conditionHash = '0x87a0def4a5e69087b59aec80df981fcda7171702b0a7e72f1ed294cd89887ded';
    expect(condition.hash()).to.eql(conditionHash);
    assert.deepEqual(Tx.fromRaw(condition.toRaw()), condition);
  });

  it('should allow to sign with web3', async () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const tx = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value, ADDR, color)],
    );

    await tx.signWeb3(web3, 0);

    const unserializedTx = Tx.fromRaw(tx.toRaw());
    for (let i = 0; i < tx.inputs.length; i += 1) {
      assert.deepEqual(tx.inputs[i].r, unserializedTx.inputs[i].r);
      assert.deepEqual(tx.inputs[i].s, unserializedTx.inputs[i].s);
      assert.deepEqual(tx.inputs[i].v, unserializedTx.inputs[i].v);
      assert.deepEqual(
        tx.inputs[i].signer.toLowerCase(),
        unserializedTx.inputs[i].signer.toLowerCase(),
      );
    }
  });
});
