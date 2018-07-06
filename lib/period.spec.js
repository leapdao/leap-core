import { expect } from 'chai';
import Block from './block';
import Tx from './transaction';
import Period from './period';

const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('periods', () => {
  it('should allow to get proof from period.', (done) => {
    const height = 123;
    const value = 50000000;
    const color = 1337;
    const deposit1 = Tx.deposit(0, value, ADDR, color);
    const deposit2 = Tx.deposit(1, value, ADDR, color);
    const block1 = new Block(height);
    block1.addTx(deposit1);
    block1.addTx(deposit2);

    const block2 = new Block(height + 1);
    block2.addTx(Tx.deposit(2, value * 2, ADDR, color));

    const period = new Period(null, [block1, block2]);
    const proof = period.proof(deposit1);
    expect(proof).to.eql([
      period.merkleRoot(),
      '0x3d03002300000000000000000000000000000000000000000000000000020000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x24b3e83782e99079e337e92ddd757857f0b8710355ee46269975e4e73bba198f',
      '0x1b06e8a1d97e382409e8cd2a0c7cf889049edab19ee339d9fbd9232f875ca903',
    ]);
    done();
  });


  it('should allow to get proof from period non-trivial position.', (done) => {
    const height = 123;
    const value = 50000000;
    const color = 1337;
    const block1 = new Block(height);
    block1.addTx(Tx.deposit(0, value, ADDR, color));
    block1.addTx(Tx.deposit(1, value, ADDR, color));
    block1.addTx(Tx.deposit(2, value, ADDR, color));

    const deposit1 = Tx.deposit(3, value, ADDR, color);
    const deposit2 = Tx.deposit(4, value, ADDR, color);
    const block2 = new Block(height + 1);
    block2.addTx(deposit1);
    block2.addTx(deposit2);
    block2.addTx(Tx.deposit(5, value, ADDR, color));

    const block3 = new Block(height + 2);
    block3.addTx(Tx.deposit(6, value * 3, ADDR, color));
    block3.addTx(Tx.deposit(7, value, ADDR, color));
    block3.addTx(Tx.deposit(8, value, ADDR, color));

    const period = new Period(null, [block1, block2, block3]);
    const proof = period.proof(deposit2);
    expect(proof).to.eql([
      period.merkleRoot(),
      '0x3d03002300000000000000050000000000000000000000000000000000020000',
      '0x00040000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x555a879df2d6e2e908a7705fb184d40cb98804d78c395467f471b0e895ab4b4b',
      '0x01ca922ad24b7bd69c5f6d48908991a9c34459fae96ee2292daf7af4b97ac169',
      '0x117394796ab987f40a955083e61c73def822ff5d252b4d359c9412d52672205a',
      '0x8f8ddd976be39ec250c0f842dc5ad659af10ba76e463a009422365ce6800790c',
    ]);
    done();
  });
});
