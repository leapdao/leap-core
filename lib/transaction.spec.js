import { expect, assert } from 'chai';
import Tx, { Type } from './transaction';

import Input from './input';
import Output from './output';
import Outpoint from './outpoint';

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('transactions', () => {

  it('should allow to create and parse deposit tx.', () => {
    const depositHash = '0xe128bcd5840cf7e92807b30053a91e7c04f0edfae76542f6667ae4c9bcc632a5';
    const value = 99000000;
    const depositId = 12;
    const color = 1337;
    const deposit = Tx.deposit(depositId, value, ADDR, color);
    // test hashing
    expect(deposit.hash()).to.eql(depositHash);
    // test parse
    const depositHex = `0x020000000c0000000005e69ec00539${ADDR.replace('0x', '')}`;
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
    const depositHash = '0xe128bcd5840cf7e92807b30053a91e7c04f0edfae76542f6667ae4c9bcc632a5';
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
    const transferSigHash = '0xc79339bc7e4672877d0aa5468f79e5cc89bb80788daa18628b9f2d1ad3a34bdb';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const color = 1337;
    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR, color)],
    );

    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0xaf269e55cee5f6f87182d00f2e966a0ad3b28a42dd742fb284645a8650b6c2e2';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x7ee359a449032b2d3786f820e4d9f74e1aef27991a942bbd903671ce88990311';
    const s = '0x3698e3b7f1f9309780f5299dee6f1b679089dd05077b9fbc39f93e290ce6f9ca';
    const transferHex = `0x03000000000754d4ec11${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1b0000000005e69ec00539${ADDR.replace('0x', '')}`;
    expect(transfer.hex()).to.eql(transferHex);
    assert.deepEqual(Tx.fromRaw(transferHex), transfer);
  });

  it('should allow to create and parse computation request tx.', () => {
    const compReqSigHash = '0xe3e620a3a0b660f209ec9ad2071febbbb26afe2e18a11652c7b39b0721bca8ea';
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
    const height = 123000044;
    const value = 99000000;
    const color = 1337;
    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR, color)],
    );

    // toJSON
    const transferHash = '0xaf269e55cee5f6f87182d00f2e966a0ad3b28a42dd742fb284645a8650b6c2e2';
    transfer.sign([PRIV]);
    const json = transfer.toJSON();
    expect(json).to.eql({
      type: Type.TRANSFER,
      hash: transferHash,
      inputs: [
        {
          hash: '0x7777777777777777777777777777777777777777777777777777777777777777',
          index: 0,
          r: '0x7ee359a449032b2d3786f820e4d9f74e1aef27991a942bbd903671ce88990311',
          s: '0x3698e3b7f1f9309780f5299dee6f1b679089dd05077b9fbc39f93e290ce6f9ca',
          signer: '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
          v: 27,
        },
      ],
      outputs: [{ address: ADDR, value, color }],
      options: {
        height: 123000044,
      },
    });
    // fromJSON
    assert.deepEqual(Tx.fromJSON(json), transfer);
  });

  it('should allow to create and parse transfer tx with 2 inputs.', () => {
    const transferSigHash = '0xda6367e582565e1d281f508e0fad4276b025da478bc509782a03eef0aa0be725';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const color = 1337;

    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value, ADDR, color)],
    );

    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0x0fca38bb5a77a54386dac39ca93893459b75aeabf506e4cd1fb0b3335de6a14c';
    transfer.sign([PRIV, PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x5805909a4bbd5dbfa8d246a90589a1ed3fa8abd5479bd7900c12e62d4ef2ec86';
    const s = '0x5e05f7625a427efd0e4c76bfce1273e334c1a98cc6bef1f99ed6ad841afc46a6';
    const transferHex = `0x03000000000754d4ec21${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1b${prevTx.replace('0x', '')}01${r.replace('0x', '')}${s.replace('0x', '')}1b0000000005e69ec00539${ADDR.replace('0x', '')}`;
    expect(transfer.hex()).to.eql(transferHex);
    assert.deepEqual(Tx.fromRaw(transferHex), transfer);
  });

  it('should allow to create and parse transfer tx with 2 outputs.', () => {
    const transferSigHash = '0x7665d94b19180d86e3494e61acf4a4122e455c9acb2eb2cc76f49675c0592263';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const color = 1337;
    const addr2 = '0xeeffddcf42c8d1ff9594b17a3f50e94a12ccaabb';

    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value / 3, ADDR, color), new Output(value / 2, addr2, color)],
    );

    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0xd0445bea5d2946f59ec4803fc909102e1b2843577b38eaca0cff429a51be831d';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x1615a3302175cf99a7b34ccc9c52e5ea7ee8133c092c9124994332aa89d83b0d';
    const s = '0x6d0cbee5088ce73ec34a5c9212ac48ff94fc83722c0b142de975d97a05478277';
    const transferHex = `03000000000754d4ec12${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1c0000000001f78a40053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f0000000002f34f600539eeffddcf42c8d1ff9594b17a3f50e94a12ccaabb`;
    const buf = Buffer.alloc(transferHex.length / 2);
    buf.write(transferHex, 'hex');
    assert(transfer.toRaw().equals(buf));
    assert.deepEqual(Tx.fromRaw(transferHex), transfer);
  });

  it('should calculate tx size', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const color = 1337;

    let tx = Tx.deposit(1, value, ADDR, color);
    expect(tx.getSize()).to.eq(tx.toRaw().length);

    tx = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value, ADDR, color)],
    );

    expect(tx.getSize()).to.eq(tx.toRaw().length);

    tx = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value / 2, ADDR, color), new Output(value / 2, ADDR, color)],
    );

    expect(tx.getSize()).to.eq(tx.toRaw().length);
    expect(tx.getSize()).to.eq(266);
  });
});
