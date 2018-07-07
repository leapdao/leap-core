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
      '0x3c03002400000000000000000000000000000000000000000000000002110000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x3d33751adbe8775871a914f0c747990feefec7dd716253d7f160fa002e358dba',
      '0xc8b1dffb5adf3db097b8b47df33a26f86ecb627af7496dab07a22c3794a30cdf',
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
      '0x3c03002400000000000000050000000000000000000000000000000002110000',
      '0x00040000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x147064ed47d784270b94ac2d6c8df693c619013d20b8578bfd78e5cb8491ba27',
      '0xd2f4ca69fd14d1f76b2d5b8258f0b873bdaada4692d0d6b4581e5ad17d790ff1',
      '0x78b010cc3436a086bf3507d2e61b5ddb5a8e37f0ce5ee9f099c0b9f3c6815dd0',
      '0x0a9c7eac5a2f01eb9d557f7c563f9bf316cd2ac34c94628848bf4ed5c06a4d6d',
    ]);
    done();
  });
});
