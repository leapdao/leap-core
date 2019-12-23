import { expect } from 'chai';
import Block from './block';
import Tx from './transaction';
import Period from './period';
import Input from './input';
import Output from './output';
import Outpoint from './outpoint';

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';
const slotId = 4;

const validatorData = {
  slotId,
  ownerAddr: ADDR
};

/**
 * Excluding prevHash from period proof as it was in the original version,
 * so that we can verify proofs for older periods
 */
const legacyOpts = {
  validatorData,
  excludePrevHashFromProof: true
}

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

    const period = new Period(null, [block1, block2], legacyOpts);
    const proof = period.proof(deposit1);
    expect(proof).to.eql([
      period.periodRoot(),
      '0x4404003c00000000000000000000000000000000000000000000000000000000',
      '0x0000000002110000000000000000000000000000000000000000000000000000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x430ce01c495ecaa94a3b4b3154906343e755b7f9e51bf3403b09dd932a0b18ee',
      '0x77bc0389ba07196637b929d5347b1453f3294175e9015e13b5e3c5fb19f3c0f4',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x03bfe7f7bc5ba5d5119009b30c5eb918b6ab5050af363b4c3844ec5565e4a604',
    ]);
    done();
  });

  it('should throw if tx is not in the period', (done) => {
    const value = 50000000;
    const color = 1337;

    const deposit1 = Tx.deposit(0, value, ADDR, color);
    const block1 = new Block(1);
    block1.addTx(deposit1);

    const deposit2 = Tx.deposit(1, value, ADDR, color);
    const block2 = new Block(2);
    block2.addTx(deposit2);

    const period = new Period(null, [block1], legacyOpts);
    expect(
      () => period.proof(deposit2)
    ).to.throw('tx not in this period');
    done();
  });

  it('should allow to get proof from period with CAS bitmap.', (done) => {
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

    const period = new Period(null, [block1, block2], {
      validatorData: {
        slotId,
        ownerAddr: ADDR,
        casBitmap: '0x4000000000000000000000000000000000000000000000000000000000000000'
      },
      excludePrevHashFromProof: true
    });
    const proof = period.proof(deposit1);
    expect(proof).to.eql([
      period.periodRoot(),
      '0x4404003c00000000000000000000000000000000000000000000000000000000',
      '0x0000000002110000000000000000000000000000000000000000000000000000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x430ce01c495ecaa94a3b4b3154906343e755b7f9e51bf3403b09dd932a0b18ee',
      '0x77bc0389ba07196637b929d5347b1453f3294175e9015e13b5e3c5fb19f3c0f4',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0xde2318630368656c2cce43bb993c6a3c077bc0b1cc75341375439f5a1206d347',
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

    const period = new Period(null, [block1, block2, block3], legacyOpts);
    const proof = period.proof(deposit2);
    expect(proof).to.eql([
      '0x8e08277cfeb7f80da02df9e165d59bd7fccc10221ee24c3d660d7a4739524fc7',
      '0x4404003c00000000000000050000000000000000000000000000000000000000',
      '0x0000000002110000000400000000000000000000000000000000000000000000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0xe950fa2c91b48744f2387a98da0fd27f4007dd85892de652f25e16eae0b7787b',
      '0x8355cc1cb67e4e927c6cf0cf2aa8d4faa457a2be252479d67d56b2516587767f',
      '0xda88b2a1f1924b588bb514f6c7789d7e726f1f6012aafd2ceb76cafe0a01d64b',
      '0x02a88b895502e1f47e75f8d91ac70b0da12a8cdd2361c725696fef0c036d6fb3',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x03bfe7f7bc5ba5d5119009b30c5eb918b6ab5050af363b4c3844ec5565e4a604',
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

    const period = new Period(null, blocks, legacyOpts);
    const proof = period.proof(Tx.deposit(12, value, ADDR, color));
    expect(proof).to.eql([
      '0x275e30e070a5637312ec95d135e8b393824e38c420ab142e8b72bb1528a26088',
      '0x4404003c00000000000000180000000000000000000000000000000000000000',
      '0x0000000002110000000c00000000000000000000000000000000000000000000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0xfec19c6cf56c2b13094661debb8e379f3abc92084848dca66e2572a71097860e',
      '0x6d14ce4a7e0cad54cddc87c037f0aa8b85f4ca898b24e8e1e93501ea436f6a86',
      '0x46c88f0026b1b0502c99df5c65501aa200a05dd853fb0b028d46198e162f0525',
      '0x481316372bde714c25b91aa165941ebb3937fc6d195a12d16486752c95403692',
      '0x3af50ca89191dd17b5191ec0c9281cb0383816f950d9189f2a86a107b1b49fca',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x03bfe7f7bc5ba5d5119009b30c5eb918b6ab5050af363b4c3844ec5565e4a604',
    ]);
    done();
  });

  it('should allow to get proof from period with some empty blocks.', (done) => {
    const value = 50000000;
    const color = 1337;

    const blocks = [];
    let block;
    for (let i = 0; i < 32; i++) {
      if (i % 2) {
        block = new Block(i).addTx(Tx.deposit(i, value, ADDR, color));
        blocks.push(block);
      } else {
        blocks.push(new Block(i));
      }
    }

    const period = new Period(null, blocks, legacyOpts);
    const proof = period.proof(Tx.deposit(13, value, ADDR, color));
    expect(proof).to.eql([
      '0x2f66d9caf3a49598e7259c850c5bf3bbf7cdc61be65846f03296b1c0f54386a2',
      '0x4404003c000000000000001a0000000000000000000000000000000000000000',
      '0x0000000002110000000d00000000000000000000000000000000000000000000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x1e0541efeeee9524e679c32b3f821ff8f873fe79fd6afffdd9606f6b010acf55',
      '0xbd73cd9e937d7ff68db45ebd9bda8aa987940a20cc7095577615c7e757bcd1c6',
      '0x3d15c3cc46b4b0ffa05b29f9148640b86af3cb7c0b4c60a4f7f807e669bcfa24',
      '0x845cb7f009fe3237c7914f8cb419fd742f81309c61bea575eeacf4ce3d067523',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x03bfe7f7bc5ba5d5119009b30c5eb918b6ab5050af363b4c3844ec5565e4a604',
    ]);
    done();
  });

  it('should allow to get proof from period with some empty blocks.', (done) => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value / 2, ADDR, color), new Output(value / 2, ADDR, color)],
    );
    transfer.sign([PRIV]);

    const blocks = [];
    let block;
    for (let i = 0; i < 31; i++) {
      if (i % 2) {
        block = new Block(i).addTx(Tx.deposit(i, value, ADDR, color));
        blocks.push(block);
      } else {
        blocks.push(new Block(i));
      }
    }
    block = new Block(31).addTx(transfer);
    blocks.push(block);

    const period = new Period(null, blocks, legacyOpts);
    const proof = period.proof(transfer);

    expect(proof).to.eql([
      '0x8b04de057fe524a3118eb7c8e14a2e55323c67fd7b6080583d1047b700b2d674',
      '0x300800d0000000000000003e0000000003127777777777777777777777777777',
      '0x77777777777777777777777777777777777700c2b5d5b0953f40dd9bbc5e534f',
      '0x2db3d4847d897b6615103a157bd69c640490c07945dc613cd500f12a009aad63',
      '0x1c530264507c1f5a8591ddc053bd5dc87bcf291b000000000000000000000000',
      '0x0000000000000000000000000000000002f34f60053982e8c6cf42c8d1ff9594',
      '0xb17a3f50e94a12cc860f00000000000000000000000000000000000000000000',
      '0x00000000000002f34f60053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x7d63e2113d90d4316fd6fd3f25837061858b8401ac1331295e922a21fe5e9579',
      '0x04fc4e57a69f3fc7b76e12212f843a49837b36dd7280539e52b12f303d1355c4',
      '0x3d5087be87669128a31314d9a3cf9d52af2e6dc96132eef574f84ed4ba260b2c',
      '0x7e85398f3d5b052c378cc3d2a15209a7e8fbaf2a2b65349f80f5faf033ddf172',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      '0x03bfe7f7bc5ba5d5119009b30c5eb918b6ab5050af363b4c3844ec5565e4a604',
    ]);
    done();
  });

  it('should allow to get proof from period with prevPeriod.', (done) => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const value = 99000000;
    const color = 1337;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value / 2, ADDR, color), new Output(value / 2, ADDR, color)],
    );
    transfer.sign([PRIV]);

    const blocks = [];
    let block;
    for (let i = 0; i < 30; i++) {
      block = new Block(i).addTx(Tx.deposit(i, value, ADDR, color));
      blocks.push(block);
    }
    block = new Block(31).addTx(transfer);
    blocks.push(block);

    const period = new Period(
      "0x8b04de057fe524a3118eb7c8e14a2e55323c67fd7b6080583d1047b700b2d674",
      blocks,
      { validatorData }
    );
    const periodAfter = new Period(period.periodRoot(), blocks, { validatorData });
    periodAfter.setValidatorData(slotId, ADDR);
    
    const proof = periodAfter.prevPeriodProof();
    expect(Period.verifyPrevPeriodProof(proof)).to.eql(periodAfter.periodRoot());
    done();
  });

  
  describe('periodForBlockRange', () => {
    it('should create period for a given block range');
  });

  describe('periodForTx', () => {
    it('should create period for a given tx');
  });
});
