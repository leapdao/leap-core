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
      '0x3c03002400000000000000000000000000000000000000000000000002010000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0xf1884e6d64327f1e82c28c38ebb4f75274a97a945d5b101baf4e1d31a635df21',
      '0x1e8f18227de5dbee1f09eba7fee5816d787c26618dbe6dd9f5b0e030680a54e3',
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
      '0x3c03002400000000000000050000000000000000000000000000000002010000',
      '0x00040000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x788b12cb18441369c33b124405e542310002a972eb940a4e7018b54369be741e',
      '0xa286d1c7204cd91f9e45243e8392e598c756c15c588b60e0fde33d5dc387120f',
      '0x6ae0c26b6cc191bbcf2e69509e314c029ecf88806c7ee498dbc8506e04796c16',
      '0x7f8539441abd6f0c0c5e718cd3074f873052acf7090fdd91837e504ddae2183e',
    ]);
    done();
  });
});
