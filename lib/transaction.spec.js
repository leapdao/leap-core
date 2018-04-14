import chai, { expect } from 'chai';
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
    const transferSigHash = '0x175bae24ead951b03e3f28b5983d7dcd5b96cd9b0b58be85bf9515e30d26a2ef';
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
    const transferHash = '0x7710856923f0748ba3ffcaa307d14b7a6776037c9199b405d13609528b934629';
    transfer = transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0xbf1c0887456f6ddf7fd45c1d3c8d09a00e85249f2eb998a6121717ac08b81d62';
    const s = '0x7fb8d91bf1323ecef665dab97acc27ed1c761eda23422b96b8eeaca317b5bda7';
    const transferHex = `0x03000000000754d4ec11${prevTx.replace('0x', '')}00${r.replace('0x', '')}${s.replace('0x', '')}1b0000000005e69ec0${ADDR.replace('0x', '')}`;
    expect(transfer.hex()).to.eql(transferHex);
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
        value,
        addr: ADDR,
      }],
    });
    done();
  });

  it('should allow to create and parse transfer tx with 2 inputs.', (done) => {
    const transferSigHash = '0xf4b709006aea14b6cee12443807dcb306d1260a0abb3829c30c35e83fd783111';
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
    const transferHash = '0xf35a1bb70031e6e5e02b49148f79805c0ac71c9a179cc23df07ad52cfe32e6ca';
    transfer = transfer.sign([PRIV, PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x7c1d8edc9f39162df47c5febb304bd6fab5d9fb8e5ccd543ae86309a200ec82d';
    const s = '0x6e87189efab15e887187d05e01b6106ba6098e1e2fefc2ecf24d19e96aa166c1';
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
    const transferSigHash = '0xb8e114985bbf0ec7b66625ad5267bd9aa2926c2182f755fe682bd16154ca4d5f';
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
    const transferHash = '0x1526209547302b72ed36f8d35805275f86eccb337a2ad9293a049f438a6112fb';
    transfer = transfer.sign([PRIV]);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0x34b2c9f44abb37693698d637982d2b9368c28a53664c30e82b156a1a1d98079c';
    const s = '0x6b246d5eae64ded1df04b02da791e86622e62d1dfbfec98f6ba47bb815d0141b';
    const transferHex = '0x03000000000754d4ec1277777777777777777777777777777777777777777777777777777777777777770034b2c9f44abb37693698d637982d2b9368c28a53664c30e82b156a1a1d98079c6b246d5eae64ded1df04b02da791e86622e62d1dfbfec98f6ba47bb815d0141b1b0000000001f78a4082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f0000000002f34f60eeffddcf42c8d1ff9594b17a3f50e94a12ccaabb';
    expect(transfer.hex()).to.eql(transferHex);
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
