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
      '0x4404003c00000000000000000000000000000000000000000000000000000000',
      '0x0000000002110000000000000000000000000000000000000000000000000000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x430ce01c495ecaa94a3b4b3154906343e755b7f9e51bf3403b09dd932a0b18ee',
      '0x77bc0389ba07196637b929d5347b1453f3294175e9015e13b5e3c5fb19f3c0f4',
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
      '0x4404003c00000000000000050000000000000000000000000000000000000000',
      '0x0000000002110000000400000000000000000000000000000000000000000000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0xe950fa2c91b48744f2387a98da0fd27f4007dd85892de652f25e16eae0b7787b',
      '0x8355cc1cb67e4e927c6cf0cf2aa8d4faa457a2be252479d67d56b2516587767f',
      '0xda88b2a1f1924b588bb514f6c7789d7e726f1f6012aafd2ceb76cafe0a01d64b',
      '0x02a88b895502e1f47e75f8d91ac70b0da12a8cdd2361c725696fef0c036d6fb3',
    ]);
    done();
  });

  it('should allow to get proof from period of 32 blocks.', (done) => {
    const value = 50000000;
    const color = 1337;

    const blocks = [];
    let block;
    for (let i = 0; i < 32; i++) {
      block = new Block(i).addTx(Tx.deposit(i, value, ADDR, color));
      blocks.push(block);
    }

    const period = new Period(null, blocks);
    const proof = period.proof(Tx.deposit(12, value, ADDR, color));
    expect(proof).to.eql([
      period.merkleRoot(),
        '0x4404003c00000000000000180000000000000000000000000000000000000000',
        '0x0000000002110000000c00000000000000000000000000000000000000000000',
        '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0xfec19c6cf56c2b13094661debb8e379f3abc92084848dca66e2572a71097860e',
        '0x6d14ce4a7e0cad54cddc87c037f0aa8b85f4ca898b24e8e1e93501ea436f6a86',
        '0x46c88f0026b1b0502c99df5c65501aa200a05dd853fb0b028d46198e162f0525',
        '0x481316372bde714c25b91aa165941ebb3937fc6d195a12d16486752c95403692',
        '0x3af50ca89191dd17b5191ec0c9281cb0383816f950d9189f2a86a107b1b49fca'
    ]);
    done();
  });
});
