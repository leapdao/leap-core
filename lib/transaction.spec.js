import { expect, assert } from 'chai';
import Tx from './transaction';
import Type from './type';

import Input from './input';
import Output from './output';
import Outpoint from './outpoint';

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

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
    // const depositHex = `0x02110000000c0000000005e69ec00539${ADDR.replace('0x', '')}`;
    // expect(deposit.hex()).to.eql(depositHex);
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
    const transferSigHash = '0xceb9d8be235dade93db293feb1e3591f22a649efc905ce5ccbc36d412c183263';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR, color)],
    );

    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0xa4adc59cc21798e941c08d19b20dc146b6d1f78f416bf712b7e62b9089d201e6';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    // const r = '0x2928fb2d2c9a1bbd531922d3a056e38f4ed1a847a4c1a06be9dd654f36478231';
    // const s = '0x1b808c60c5d829981ff4923c70389e0f2c7c7e8650436bd0c7a3abed7a26d1db';
    // const transferHex = `0x0311${prevTx.replace('0x', '')}00${r.replace('0x', '')}'
    // + '${s.replace('0x', '')}1c0000000005e69ec00539${ADDR.replace('0x', '')}`;
    // expect(transfer.hex()).to.eql(transferHex);
    // assert.deepEqual(Tx.fromRaw(transferHex), transfer);
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

  it('should allow to create and parse computation request tx.', () => {
    const compReqSigHash = '0x086b60e001dcda617cf57dc26c0831e9bb690383fae5d6e02d60543f9931aee4';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const gasPrice = 123000044;
    const value = 99000000;
    const color = 1337;
    const compReq = Tx.compRequest([
      new Input({   // output of comp Resp
        prevout: new Outpoint(prevTx, 0),
      }),
      new Input(new Outpoint(prevTx, 1)),  // output of some transfer
    ], [new Output({
      value,
      color,
      address: ADDR,
      gasPrice,
      msgData: '0x1234',
    })],
    );
    // test hashing
    expect(compReq.sigHash()).to.eql(compReqSigHash);
    // test signing
    const compReqHash = '0x05a1a78637ef6427830e28dd24f0cb65bbf9f2e614778999820abcdb73a97e38';
    compReq.sign([null, PRIV]);
    expect(compReq.hash()).to.eql(compReqHash);
    // test parse
    // const r = '0xa43e0d62419df4b804e6bc1a21cc75cd2708e2596ca64d72b376c3e0bf42d18a';
    // const s = '0x060a378d7ea270863f3075b9fb9b1a33fda078c49bd468869161c609692aa1fd';
    // const compReqHex = `0x0521${prevTx.replace('0x', '')}00${prevTx.replace('0x', '')}0'
    // + '1${r.replace('0x', '')}${s.replace('0x', '')}1c0000000005e69ec00539
    // ${ADDR.replace('0x', '')}0754d4ec00021234`;
    // expect(compReq.hex()).to.eql(compReqHex);
    // assert.deepEqual(Tx.fromRaw(compReqHex), compReq);
    assert.deepEqual(Tx.fromRaw(compReq.toRaw()), compReq);
  });

  it('should allow to create and parse computation request tx with change output', () => {
    const compReqSigHash = '0x10ae620a2220805156354affda933d6bb7ed04c50254a213e3d9471a11b42322';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const gasPrice = 123000044;
    const value = 99000000;
    const color = 1337;
    const compReq = Tx.compRequest([
      new Input({   // output of comp Resp
        prevout: new Outpoint(prevTx, 0),
      }),
      new Input(new Outpoint(prevTx, 1)),  // output of some transfer
    ], [
      new Output({
        value: value / 2,
        color,
        address: ADDR,
        gasPrice,
        msgData: '0x1234',
      }),
      new Output(value / 2, ADDR, color),
    ]);
    // test hashing
    expect(compReq.sigHash()).to.eql(compReqSigHash);
    // test signing
    const compReqHash = '0xdcd02699132eaaa31a854decb77862b3cc06de6cd32914a6e85c54fa5ffd55d7';
    compReq.sign([null, PRIV]);
    expect(compReq.hash()).to.eql(compReqHash);
    // test parse
    // const r = '0xa5fe2949bc975879962eb3d0ce001f9abd28bd3be3e433869dfd68056752e327';
    // const s = '0x00e582dcdbbe0435581221258fbf52dd2bcfbee380c976ae69471c346a726b29';
    // const compReqHex = `0x0522${prevTx.replace('0x', '')}00${prevTx.replace('0x', '')}0'
    // + '1${r.replace('0x', '')}${s.replace('0x', '')}1b0000000002f34f600539
    // ${ADDR.replace('0x', '')}0754d4ec000212340000000002f34f600539${ADDR.replace('0x', '')}`;
    // expect(compReq.hex()).to.eql(compReqHex);
    // assert.deepEqual(Tx.fromRaw(compReqHex), compReq);
    assert.deepEqual(Tx.fromRaw(compReq.toRaw()), compReq);
  });

  it('should allow to create and parse computation response tx.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const compResp = Tx.compResponse([
      new Input({   // output of comp Resp
        prevout: new Outpoint(prevTx, 0),
      })], [
        new Output({
          value,
          color,
          address: ADDR,
          storageRoot: PRIV,
        })],
    );
    // test hashing
    const compRespHash = '0xc770ef11d67a28dab819aab4cc02fea1c64ba539dc9f1c30f299866f6c008ee4';
    expect(compResp.hash()).to.eql(compRespHash);
    // test parse
    // const compRespHex = `0x0611${prevTx.replace('0x', '')}000000000005e69ec00539' +
    // '${ADDR.replace('0x', '')}${PRIV.replace('0x', '')}`;
    // expect(compResp.hex()).to.eql(compRespHex);
    // assert.deepEqual(Tx.fromRaw(compRespHex), compResp);
    assert.deepEqual(Tx.fromRaw(compResp.toRaw()), compResp);
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
    const transferHash = '0xa4adc59cc21798e941c08d19b20dc146b6d1f78f416bf712b7e62b9089d201e6';
    transfer.sign([PRIV]);
    const json = transfer.toJSON();
    expect(json).to.eql({
      type: Type.TRANSFER,
      hash: transferHash,
      inputs: [
        {
          hash: '0x7777777777777777777777777777777777777777777777777777777777777777',
          index: 0,
          r: '0x498c5faa245514842160d10af08ed57028776e0ac5c64ae66a2f214bfb5a2de9',
          s: '0x4620e88cce228b64670b3031f9fddde65b7b5798443601c5225d692409b3195b',
          signer: '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
          v: 28,
        },
      ],
      outputs: [{ address: ADDR, value, color }],
    });
    // fromJSON
    assert.deepEqual(Tx.fromJSON(json), transfer);
  });

  it('should allow to create and parse transfer tx with 2 inputs.', () => {
    const transferSigHash = '0x09d9632f4759c10d18a0e21e51f17da0b1c501b033b460eab5d8f6f083971f1f';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;

    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value, ADDR, color)],
    );

    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0x96969a461caf43cdb277a03cf58bc3a66696671a639543950c1f43c278eafa94';
    transfer.sign([PRIV, PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    // const r = '0xbf453139d1515c3df30dcd22afb25e9f81d80ba08990eae558148913e17557bd';
    // const s = '0x33141cb0742d2cb8e7ce1e05ed9c9b66dd1d9b8792d00f9db1606f0336dc5cbc';
    // const transferHex = `0x0321${prevTx.replace('0x', '')}00${r.replace('0x', '')}
    // ${s.replace('0x', '')}1c${prevTx.replace('0x', '')}01${r.replace('0x', '')}
    // ${s.replace('0x', '')}1c0000000005e69ec00539${ADDR.replace('0x', '')}`;
    // expect(transfer.hex()).to.eql(transferHex);
    // assert.deepEqual(Tx.fromRaw(transferHex), transfer);
    assert.deepEqual(Tx.fromRaw(transfer.toRaw()), transfer);
  });

  it('should allow to create and parse transfer tx with 2 outputs.', () => {
    const transferSigHash = '0x087a9c04bf0f03a35ea9983c9f9223f9f95999b8126e5ec6af1b6360123d0d69';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const addr2 = '0xeeffddcf42c8d1ff9594b17a3f50e94a12ccaabb';

    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value / 3, ADDR, color), new Output(value / 2, addr2, color)],
    );

    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0xac89b9c35bb0e99c835e670789cd24c80b153f59954fabe3e0ea82a0af4c2885';
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
});
