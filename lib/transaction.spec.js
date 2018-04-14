import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import BigNumber from 'bignumber.js';
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
    const transferSigHash = '0x0cf5082b78b9f95e35a1b1930352c77e8c9171cb8dca527d742cf92d2adef0e5';
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
    const transferHash = '0x36a85f141387f32a8b63ea179ec0b180f60b39ed7c42fe0c07f35d3fc884baba';
    transfer = transfer.sign(PRIV);
    expect(transfer.hash()).to.eql(transferHash);
    // test parse
    const r = '0xcbde01bea6bead5852ade6fe507f9163089ab672637284e241888b2adc605c1c';
    const s = '0x26beeb970a2f7dea2a98faa6653dbbc57926508493724d3205377c2bf0e41789';
    const transferHex = `0x03000000000754d4ec11${prevTx.replace('0x','')}000000000005e69ec0${ADDR.replace('0x','')}${r.replace('0x','')}${s.replace('0x','')}1c`;
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

});
