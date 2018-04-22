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
    const transferHash = '0x57b9888b54474c5bc0faf911932437607e4f2207a35a2281548b510a37d32632';
    transfer = transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x2e258a4ff440bc77f784792bbb3b3598709efd97198f1e59dc8f2c03ac20621d';
    const s = '0x1783f9a1b58da8d00cbb8a58c12edc82725466f6421d3232369c236a4775f32b';
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
    const transferHash = '0x1df8b3b22240d0ef4f65677c71fc885be145bf9256ce56b00c3f9587d91d78d8';
    transfer = transfer.sign([PRIV, PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0xbe662ed1eace9e228ee816b0366a6533ff12d7d728e51c614340b423a5907074';
    const s = '0x2384001c0cdb3085beb17cf9bef31878ed99aa01d5f37a7ffccde1e625957f64';
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
    const transferHash = '0xdba80e8db3f29dd53b09cfebc16e1a7803323037dd981dd06bacb267aebc7345';
    transfer = transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x824a68a5a88c387762cd8984802b1b4e8c06e90a3d7aa8159f4286c1e0e5889b';
    const s = '0x7009414c0085802a9e751e9052130e8c2d685eb55453a87904b518b0922bd2f5';
    const transferHex = `03000000000754d4ec12${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1b0000000001f78a4082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f0000000002f34f60eeffddcf42c8d1ff9594b17a3f50e94a12ccaabb`;
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
        v: 27,
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
