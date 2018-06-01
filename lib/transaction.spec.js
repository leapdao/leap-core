import { expect, assert } from 'chai';
import Tx, { Type } from './transaction';

import Input from './input';
import Output from './output';
import Outpoint from './outpoint';

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('transactions', () => {
  it('should allow to create and parse coinbase tx.', () => {
    const coinbaseHash = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const value = 50000000;
    const coinbase = Tx.coinbase(value, ADDR);
    // test hashing
    expect(coinbase.hash()).to.eql(coinbaseHash);
    // test parse
    const coinbaseHex = `0x010000000002faf080${ADDR.replace('0x', '')}`;
    expect(coinbase.hex()).to.eql(coinbaseHex);
    assert(Tx.fromRaw(coinbaseHex).equals(coinbase));
  });

  it('should allow to serialze and deserialize coinbase tx to/from json.', () => {
    const coinbaseHash = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const value = 50000000;
    const coinbase = Tx.coinbase(value, ADDR);
    // toJSON
    const json = coinbase.toJSON();
    expect(json).to.eql({
      type: Type.COINBASE,
      hash: coinbaseHash,
      inputs: [],
      outputs: [{
        address: ADDR,
        value,
      }],
    });
    // fromJSON
    assert(Tx.fromJSON(json).equals(coinbase));
  });

  it('should allow to create and parse deposit tx.', () => {
    const depositHash = '0x0df38bc2ecfc9d2dab65e3d9f59c188e85f034c9289af4dfca5d506ad94db73e';
    const value = 99000000;
    const depositId = 12;
    const deposit = Tx.deposit(depositId, value, ADDR);
    // test hashing
    expect(deposit.hash()).to.eql(depositHash);
    // test parse
    const depositHex = `0x020000000c0000000005e69ec0${ADDR.replace('0x', '')}`;
    expect(deposit.hex()).to.eql(depositHex);
    assert(Tx.fromRaw(depositHex).equals(deposit));
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
    assert(Tx.fromRaw(exitHex).equals(exit));
  });

  it('should allow to serialze and deserialize deposit tx to/from json.', () => {
    const depositHash = '0x0df38bc2ecfc9d2dab65e3d9f59c188e85f034c9289af4dfca5d506ad94db73e';
    const value = 99000000;
    const depositId = 12;
    const deposit = Tx.deposit(depositId, value, ADDR);
    // toJSON
    const json = deposit.toJSON();
    expect(json).to.eql({
      type: Type.DEPOSIT,
      hash: depositHash,
      inputs: [],
      outputs: [{ address: ADDR, value }],
      options: { depositId },
    });
    // fromJSON
    assert(Tx.fromJSON(json).equals(deposit));
  });

  it('should allow to create and parse transfer tx.', () => {
    const transferSigHash = '0x64ee1fed7e68f8e68d48fb41f6f36cf6c4a313e2e66fbe636a4e48b840d9a690';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR)],
    );

    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0x57b9888b54474c5bc0faf911932437607e4f2207a35a2281548b510a37d32632';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x2e258a4ff440bc77f784792bbb3b3598709efd97198f1e59dc8f2c03ac20621d';
    const s = '0x1783f9a1b58da8d00cbb8a58c12edc82725466f6421d3232369c236a4775f32b';
    const transferHex = `0x03000000000754d4ec11${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1c0000000005e69ec0${ADDR.replace('0x', '')}`;
    expect(transfer.hex()).to.eql(transferHex);
    assert(Tx.fromRaw(transferHex).equals(transfer));
  });

  it('should allow to serialze and deserialize transfer tx to/from json.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR)],
    );

    // toJSON
    const transferHash = '0x57b9888b54474c5bc0faf911932437607e4f2207a35a2281548b510a37d32632';
    transfer.sign([PRIV]);
    const json = transfer.toJSON();
    expect(json).to.eql({
      type: Type.TRANSFER,
      hash: transferHash,
      inputs: [
        {
          hash: '0x7777777777777777777777777777777777777777777777777777777777777777',
          index: 0,
          r: '0x2e258a4ff440bc77f784792bbb3b3598709efd97198f1e59dc8f2c03ac20621d',
          s: '0x1783f9a1b58da8d00cbb8a58c12edc82725466f6421d3232369c236a4775f32b',
          signer: '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
          v: 28,
        },
      ],
      outputs: [{ address: ADDR, value }],
      options: {
        height: 123000044,
      },
    });
    // fromJSON
    assert(Tx.fromJSON(json).equals(transfer));
  });

  it('should allow to create and parse transfer tx with 2 inputs.', () => {
    const transferSigHash = '0xdadd04ac25fe7b7ab6d2d146691732e066fcb444c7bcff5967e8f0284469ffea';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;

    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
      [new Output(value, ADDR)],
    );

    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0x1df8b3b22240d0ef4f65677c71fc885be145bf9256ce56b00c3f9587d91d78d8';
    transfer.sign([PRIV, PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0xbe662ed1eace9e228ee816b0366a6533ff12d7d728e51c614340b423a5907074';
    const s = '0x2384001c0cdb3085beb17cf9bef31878ed99aa01d5f37a7ffccde1e625957f64';
    const transferHex = `0x03000000000754d4ec21${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1c${prevTx.replace('0x', '')}01${r.replace('0x', '')}${s.replace('0x', '')}1c0000000005e69ec0${ADDR.replace('0x', '')}`;
    expect(transfer.hex()).to.eql(transferHex);
    assert(Tx.fromRaw(transferHex).equals(transfer));
  });

  it('should allow to create and parse transfer tx with 2 outputs.', () => {
    const transferSigHash = '0x68da068e3f88535d5326796cf86ae0388ba70ee609e302bd89cd5440bf07f939';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const addr2 = '0xeeffddcf42c8d1ff9594b17a3f50e94a12ccaabb';

    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value / 3, ADDR), new Output(value / 2, addr2)],
    );

    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0xdba80e8db3f29dd53b09cfebc16e1a7803323037dd981dd06bacb267aebc7345';
    transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x824a68a5a88c387762cd8984802b1b4e8c06e90a3d7aa8159f4286c1e0e5889b';
    const s = '0x7009414c0085802a9e751e9052130e8c2d685eb55453a87904b518b0922bd2f5';
    const transferHex = `03000000000754d4ec12${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1b0000000001f78a4082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f0000000002f34f60eeffddcf42c8d1ff9594b17a3f50e94a12ccaabb`;
    const buf = Buffer.alloc(transferHex.length / 2);
    buf.write(transferHex, 'hex');
    assert(transfer.toRaw().equals(buf));
    assert(Tx.fromRaw(transferHex).equals(transfer));
  });
});
