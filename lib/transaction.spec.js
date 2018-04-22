import chai, { expect, assert } from 'chai';
import sinonChai from 'sinon-chai';
import Tx, { Type } from './transaction';

chai.use(sinonChai);

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('transactions', () => {
  it('should allow to create and parse coinbase tx.', (done) => {
    const coinbaseHash = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const value = 50000000;
    const coinbase = new Tx().coinbase(value, ADDR);
    // test hashing
    expect(coinbase.hash()).to.eql(coinbaseHash);
    // test parse
    const coinbaseHex = `0x010000000002faf080${ADDR.replace('0x', '')}`;
    expect(coinbase.hex()).to.eql(coinbaseHex);
    expect(Tx.parse(coinbaseHex)).to.eql({
      type: Type.COINBASE,
      outs: [{
        value,
        addr: ADDR,
      }],
    });
    done();
  });

  it('should allow to create and parse deposit tx.', (done) => {
    const depositHash = '0x0df38bc2ecfc9d2dab65e3d9f59c188e85f034c9289af4dfca5d506ad94db73e';
    const value = 99000000;
    const depositId = 12;
    const deposit = new Tx().deposit(depositId, value, ADDR);
    // test hashing
    expect(deposit.hash()).to.eql(depositHash);
    // test parse
    const depositHex = `0x020000000c0000000005e69ec0${ADDR.replace('0x', '')}`;
    expect(deposit.hex()).to.eql(depositHex);
    expect(Tx.parse(depositHex)).to.eql({
      type: Type.DEPOSIT,
      ins: [{
        depositId,
      }],
      outs: [{
        value,
        addr: ADDR,
      }],
    });
    done();
  });

  it('should allow to create and parse transfer tx.', (done) => {
    const transferSigHash = '0x64ee1fed7e68f8e68d48fb41f6f36cf6c4a313e2e66fbe636a4e48b840d9a690';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    let transfer = new Tx(height).transfer([{
      prevTx,
      outPos: 0,
    }], [{
      value,
      addr: ADDR,
    }]);
    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0xe6c3e6aeb6b0ab4e0436a7f80c9b5cebd601c4b10eec0679f5f7c9065f0906d4';
    transfer = transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x4dddb562090a2c3565f3fd46bdece69c95e396d63b783e88eb1b526311ac15c2';
    const s = '0x43ab5045f28cfd7916d1ba03bf7360e41f3ae54e3fcb855bcb5aa81b4afae7ed';
    const transferHex = `0x03000000000754d4ec11${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1c0000000005e69ec0${ADDR.replace('0x', '')}`;
    expect(transfer.hex()).to.eql(transferHex);
    expect(Tx.parse(transferHex)).to.eql({
      type: Type.TRANSFER,
      height,
      ins: [{
        prevTx,
        outPos: 0,
        r,
        s,
        v: 28,
      }],
      outs: [{
        value,
        addr: ADDR,
      }],
    });
    done();
  });

  it('should allow to create and parse transfer tx with 2 inputs.', (done) => {
    const transferSigHash = '0xdadd04ac25fe7b7ab6d2d146691732e066fcb444c7bcff5967e8f0284469ffea';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    let transfer = new Tx(height).transfer([{
      prevTx,
      outPos: 0,
    }, {
      prevTx,
      outPos: 1,
    }], [{
      value,
      addr: ADDR,
    }]);
    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0x8566cfd86f30ed280bec62e18e8cb1858f2479d19dfce646b59c3e16f5db8e30';
    transfer = transfer.sign([PRIV, PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x2a6b5aef353bc66c624ddb99720730c9f290b66de84f764787f4bf61f836be9f';
    const s = '0x0393d09f63e68890754c577f0b2435c7179a049323c58ba49c1774cd5d0a50e5';
    const transferHex = `0x03000000000754d4ec21${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1c${prevTx.replace('0x', '')}01${r.replace('0x', '')}${s.replace('0x', '')}1c0000000005e69ec0${ADDR.replace('0x', '')}`;
    expect(transfer.hex()).to.eql(transferHex);
    expect(Tx.parse(transferHex)).to.eql({
      type: Type.TRANSFER,
      height,
      ins: [{
        prevTx,
        outPos: 0,
        r,
        s,
        v: 28,
      }, {
        prevTx,
        outPos: 1,
        r,
        s,
        v: 28,
      }],
      outs: [{
        value,
        addr: ADDR,
      }],
    });
    done();
  });

  it('should allow to create and parse transfer tx with 2 outputs.', (done) => {
    const transferSigHash = '0x68da068e3f88535d5326796cf86ae0388ba70ee609e302bd89cd5440bf07f939';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const addr2 = '0xeeffddcf42c8d1ff9594b17a3f50e94a12ccaabb';
    let transfer = new Tx(height).transfer([{
      prevTx,
      outPos: 0,
    }], [{
      value: value / 3,
      addr: ADDR,
    }, {
      value: value / 2,
      addr: addr2,
    }]);
    // test hashing
    expect(transfer.sigHash()).to.eql(transferSigHash);
    // test signing
    const transferHash = '0xbe00bd18f43f80f04746171c0a7915dae82c74f5fea4804524110077f801655e';
    transfer = transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x611a57db72f98022017bef273a521814790fa3009cfefb6897e634c02df5705a';
    const s = '0x6142285e3a320c8d13c3ce73e5abdbae2ddf43c00015c9d55dfa1aab74553d80';
    const transferHex = '03000000000754d4ec12777777777777777777777777777777777777777777777777777777777777777700611a57db72f98022017bef273a521814790fa3009cfefb6897e634c02df5705a6142285e3a320c8d13c3ce73e5abdbae2ddf43c00015c9d55dfa1aab74553d801c0000000001f78a4082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f0000000002f34f60eeffddcf42c8d1ff9594b17a3f50e94a12ccaabb';
    const buf = Buffer.alloc(transferHex.length / 2);
    buf.write(transferHex, 'hex');
    assert(transfer.buf().equals(buf));
    expect(Tx.parse(transferHex)).to.eql({
      type: Type.TRANSFER,
      height,
      ins: [{
        prevTx,
        outPos: 0,
        r,
        s,
        v: 28,
      }],
      outs: [{
        value: value / 3,
        addr: ADDR,
      }, {
        value: value / 2,
        addr: addr2,
      }],
    });
    done();
  });
});
