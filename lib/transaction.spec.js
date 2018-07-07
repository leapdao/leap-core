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
    const depositHash = '0xb2ca7c70c5dce710fe86d40c04b2b5541d234ef92409c1537f857f04b88d5937';
    const value = 99000000;
    const depositId = 12;
    const color = 1337;
    const deposit = Tx.deposit(depositId, value, ADDR, color);
    // test hashing
    expect(deposit.hash()).to.eql(depositHash);
    // test parse
    const depositHex = `0x02010000000c0000000005e69ec00539${ADDR.replace('0x', '')}`;
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
    const depositHash = '0xb2ca7c70c5dce710fe86d40c04b2b5541d234ef92409c1537f857f04b88d5937';
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

  it('should allow to create and parse computation request tx.', () => {
    const compReqSigHash = '0xe3e620a3a0b660f209ec9ad2071febbbb26afe2e18a11652c7b39b0721bca8ea';
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
      gasPrice,
      msgData: '0x1234',
    })],
    );
    // test hashing
    expect(compReq.sigHash()).to.eql(compReqSigHash);
    // test signing
    const compReqHash = '0x5879f2c12da978a1f06af786123aefc54fbc697943e38f6d6435eac25d077796';
    compReq.sign([null, PRIV]);
    expect(compReq.hash()).to.eql(compReqHash);
    // test parse
    const r = '0x0fddb429c91471bde67b6e1378ca5a63ab40d27beca42a0c175b992e12300c5e';
    const s = '0x679a89ae4998416956aee8b4e142676067d618921b45e5a596a59b2af27d5389';
    const compReqHex = `0x0521${prevTx.replace('0x', '')}00${prevTx.replace('0x', '')}01${r.replace('0x', '')}${s.replace('0x', '')}1b0000000005e69ec005390754d4ec00021234`;
    expect(compReq.hex()).to.eql(compReqHex);
    assert.deepEqual(Tx.fromRaw(compReqHex), compReq);
  });

  it('should allow to create and parse computation request tx with change output', () => {
    const compReqSigHash = '0xab3b348592b5cc8e37b805c751bcc150010bd2f4c69013958d2740ce37e5e8e2';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const gasPrice = 123000044;
    const value = 99000000;
    const color = 1337;
    const compReq = Tx.compRequest([
      new Input({   // output of comp Resp
        contractAddr: '0x1234',
        prevout: new Outpoint(prevTx, 0),
      }),
      new Input(new Outpoint(prevTx, 1)),  // output of some transfer
    ], [
      new Output({
        value: value / 2,
        color,
        gasPrice,
        msgData: '0x1234',
      }),
      new Output(value / 2, ADDR, color),
    ]);
    // test hashing
    expect(compReq.sigHash()).to.eql(compReqSigHash);
    // test signing
    const compReqHash = '0x0d5223341b961bdcb58733662623021c3da3d9bdef84ed42818a5cef9107c849';
    compReq.sign([null, PRIV]);
    expect(compReq.hash()).to.eql(compReqHash);
    // test parse
    const r = '0x6ea3fcdcbfcfe1b5225c45086678dc3ca4a671e7811f59c0f84684e1ef8908aa';
    const s = '0x2caa1b2b3e77a44a2e01d46e0e184d42b75f1725aa7ed64332f62c141484754f';
    const compReqHex = `0x0522${prevTx.replace('0x', '')}00${prevTx.replace('0x', '')}01${r.replace('0x', '')}${s.replace('0x', '')}1c0000000002f34f6005390754d4ec000212340000000002f34f600539${ADDR.replace('0x', '')}`;
    expect(compReq.hex()).to.eql(compReqHex);
    assert.deepEqual(Tx.fromRaw(compReqHex), compReq);
  });

  it('should allow to create and parse computation response tx.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const compResp = Tx.compResponse([
      new Input({   // output of comp Resp
        contractAddr: '0x1234',
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
