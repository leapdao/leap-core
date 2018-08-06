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
    const depositHash = '0x69c772ac710774adb78e23f7ee73e7fdd7f05b6f4a0d327c5e3a62344269a91f';
    const value = 99000000;
    const depositId = 12;
    const color = 1337;
    const deposit = Tx.deposit(depositId, value, ADDR, color);
    // test hashing
    expect(deposit.hash()).to.eql(depositHash);
    // test parse
    const depositHex = `0x02110000000c0000000005e69ec00539${ADDR.replace('0x', '')}`;
    expect(deposit.hex()).to.eql(depositHex);
    assert.deepEqual(Tx.fromRaw(depositHex), deposit);
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
    const depositHash = '0x69c772ac710774adb78e23f7ee73e7fdd7f05b6f4a0d327c5e3a62344269a91f';
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
    const transferSigHash = '0x835fcdd37ab4baddb5e6c350dd8b4d46ae917a439852b92dd89a2b8864e51f3e';
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
    const transferHash = '0x4e4823c9cb13f88db33ebf45552af83676e07434d813b71f9e9a95d933d2274f';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x2928fb2d2c9a1bbd531922d3a056e38f4ed1a847a4c1a06be9dd654f36478231';
    const s = '0x1b808c60c5d829981ff4923c70389e0f2c7c7e8650436bd0c7a3abed7a26d1db';
    const transferHex = `0x0311${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1c0000000005e69ec00539${ADDR.replace('0x', '')}`;
    expect(transfer.hex()).to.eql(transferHex);
    assert.deepEqual(Tx.fromRaw(transferHex), transfer);
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

    assert.deepEqual(Tx.fromRaw(consolidate.hex()), consolidate);
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
    const compReqSigHash = '0x33bb33bb94e059fa64b7d648db1484f9168158d18fc3eeb22988de32fa1bf03d';
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
    const compReqHash = '0x896f2c021ebe3a4621849b5163dce69280f8bac55cf9fa2ba31f606ae23ada25';
    compReq.sign([null, PRIV]);
    expect(compReq.hash()).to.eql(compReqHash);
    // test parse
    const r = '0xa43e0d62419df4b804e6bc1a21cc75cd2708e2596ca64d72b376c3e0bf42d18a';
    const s = '0x060a378d7ea270863f3075b9fb9b1a33fda078c49bd468869161c609692aa1fd';
    const compReqHex = `0x0521${prevTx.replace('0x', '')}00${prevTx.replace('0x', '')}01${r.replace('0x', '')}${s.replace('0x', '')}1c0000000005e69ec00539${ADDR.replace('0x', '')}0754d4ec00021234`;
    expect(compReq.hex()).to.eql(compReqHex);
    assert.deepEqual(Tx.fromRaw(compReqHex), compReq);
  });

  it('should allow to create and parse computation request tx with change output', () => {
    const compReqSigHash = '0x9c66b8390170454813aab775318008da1d8a59dd5425ece4f5395e949441cd92';
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
    const compReqHash = '0xffe088731fb7a8859a7347557289b6366f83ee0211fb77e9d8d78a6e2f5950ce';
    compReq.sign([null, PRIV]);
    expect(compReq.hash()).to.eql(compReqHash);
    // test parse
    const r = '0xa5fe2949bc975879962eb3d0ce001f9abd28bd3be3e433869dfd68056752e327';
    const s = '0x00e582dcdbbe0435581221258fbf52dd2bcfbee380c976ae69471c346a726b29';
    const compReqHex = `0x0522${prevTx.replace('0x', '')}00${prevTx.replace('0x', '')}01${r.replace('0x', '')}${s.replace('0x', '')}1b0000000002f34f600539${ADDR.replace('0x', '')}0754d4ec000212340000000002f34f600539${ADDR.replace('0x', '')}`;
    expect(compReq.hex()).to.eql(compReqHex);
    assert.deepEqual(Tx.fromRaw(compReqHex), compReq);
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
    const compRespHash = '0x0ae10f5cfb9b8d92ee56065aa2e482e028c244c64bf2a38a42356cf48ce37af5';
    expect(compResp.hash()).to.eql(compRespHash);
    // test parse
    const compRespHex = `0x0611${prevTx.replace('0x', '')}000000000005e69ec00539${ADDR.replace('0x', '')}${PRIV.replace('0x', '')}`;
    expect(compResp.hex()).to.eql(compRespHex);
    assert.deepEqual(Tx.fromRaw(compRespHex), compResp);
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
    const transferHash = '0x4e4823c9cb13f88db33ebf45552af83676e07434d813b71f9e9a95d933d2274f';
    transfer.sign([PRIV]);
    const json = transfer.toJSON();
    expect(json).to.eql({
      type: Type.TRANSFER,
      hash: transferHash,
      inputs: [
        {
          hash: '0x7777777777777777777777777777777777777777777777777777777777777777',
          index: 0,
          r: '0x2928fb2d2c9a1bbd531922d3a056e38f4ed1a847a4c1a06be9dd654f36478231',
          s: '0x1b808c60c5d829981ff4923c70389e0f2c7c7e8650436bd0c7a3abed7a26d1db',
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
    const transferSigHash = '0xfe407167f8a8e5df98cf8405f45dfdea34232a9d1a666ab5a7e7d31998647f03';
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
    const transferHash = '0x1c1ec4011a4571b0e1dd3957065aa01a849a7ad929f8e0eafdca8bf39250352c';
    transfer.sign([PRIV, PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0xbf453139d1515c3df30dcd22afb25e9f81d80ba08990eae558148913e17557bd';
    const s = '0x33141cb0742d2cb8e7ce1e05ed9c9b66dd1d9b8792d00f9db1606f0336dc5cbc';
    const transferHex = `0x0321${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1c${prevTx.replace('0x', '')}01${r.replace('0x', '')}${s.replace('0x', '')}1c0000000005e69ec00539${ADDR.replace('0x', '')}`;
    expect(transfer.hex()).to.eql(transferHex);
    assert.deepEqual(Tx.fromRaw(transferHex), transfer);
  });

  it('should allow to create and parse transfer tx with 2 outputs.', () => {
    const transferSigHash = '0x5e4b3e6ca9b2e2090db20e431ba0279b83dac629d5bab711d2440da51da183ac';
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
    const transferHash = '0x1db182361345711c49ed6a0cb38156ee1619c5c053a306896d1a021cc661c6f6';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0xb412ecf4a749458462ece9588eececd692ad20933b4456637e7c1048dad1c60d';
    const s = '0x350cdfb56ddb873c4f6852ab452244533a40401c9cd579c86225c4c48531d8b3';
    const transferHex = `0312${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1c0000000001f78a40053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f0000000002f34f600539eeffddcf42c8d1ff9594b17a3f50e94a12ccaabb`;
    const buf = Buffer.alloc(transferHex.length / 2);
    buf.write(transferHex, 'hex');
    assert(transfer.toRaw().equals(buf));
    assert.deepEqual(Tx.fromRaw(transferHex), transfer);
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
    expect(tx.getSize()).to.eq(258);
  });
});
