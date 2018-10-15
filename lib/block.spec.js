import { expect, assert } from 'chai';
import Block from './block';
import Tx from './transaction';
import Input from './input';
import Output from './output';
import Outpoint from './outpoint';

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('blocks', () => {
  it('should disallow duplicated transactions.', (done) => {
    const height = 123;
    const value = 50000000;
    const deposit = Tx.deposit(1, value, ADDR, 1337);
    const block = new Block(height);
    block.addTx(deposit);

    expect(() => {
      block.addTx(deposit);
    }).to.throw('tx already contained');

    done();
  });

  it('should allow to create block with deposit.', (done) => {
    const height = 123;
    const value = 50000000;
    const deposit = Tx.deposit(5789, value, ADDR, 1337);
    const block = new Block(height);
    block.addTx(deposit);
    expect(block.merkleRoot()).to.eql('0xade20a683728e871aa485f65092190ea46d51c99e1074bc4c48de5d17c1231d0');
    // test hashing
    expect(block.hash()).to.eql('0x92c35a29644bef6e0c980641f4fc3d78d2f71bda760c9d80f3cf99e122b4502c');

    // create proof

    const proof = block.proof(deposit);
    expect(proof).to.eql([
      '0xade20a683728e871aa485f65092190ea46d51c99e1074bc4c48de5d17c1231d0',
      '0x4404003c00000000000000000000000000000000000000000000000000000000',
      '0x0000000002110000169d00000000000000000000000000000000000000000000',
      '0x00000000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should allow to create block with transfer.', (done) => {
    const parent = '0x4920616d207665727920616e6772792c20627574206974207761732066756e21';
    const height = 1;
    const value = 50000000;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(parent, 0))],
      [new Output(value, ADDR)],
    );

    transfer.sign([PRIV]);

    const block = new Block(height);
    block.addTx(transfer);
    expect(block.merkleRoot()).to.eql('0x08d5f3538b72556c27644c15b99eae34ce7abee11e2d0200648bfa10e71849ed');
    // test hashing
    expect(block.hash()).to.eql('0xf5d78acea1276ff020d2afd6a27c55fe7f862dcec22bde4b74aecd5d28c36aa4');

    // create proof

    const proof = block.proof(transfer);
    expect(proof).to.eql([
      '0x08d5f3538b72556c27644c15b99eae34ce7abee11e2d0200648bfa10e71849ed',
      '0x4607009a00000000000000000000000000000000000000000000000000000000',
      '0x00000000000003114920616d207665727920616e6772792c2062757420697420',
      '0x7761732066756e21002740212b16a568f1a93d5b8953bce220dc546bc88e2452',
      '0x7f2600f5509eaf16b14323e2131530f5b93c83793a50c82d69b687d00dd64561',
      '0xa5cc87f02657dd53f91c00000000000000000000000000000000000000000000',
      '0x00000000000002faf080000082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should allow to create block with multiple transactions.', () => {
    const parent = '0x4920616d207665727920616e6772792c20627574206974207761732066756e21';
    const height = 1;
    const transfer1 = Tx.transfer(
      [new Input(new Outpoint(parent, 0))],
      [new Output(50000000, ADDR)],
    );

    const transfer2 = Tx.transfer(
      [new Input(new Outpoint(parent, 1))],
      [new Output(10000000, ADDR)],
    );

    transfer1.sign([PRIV]);
    transfer2.sign([PRIV]);

    const block = new Block(height);
    block.addTx(transfer2);
    block.addTx(transfer1);

    expect(block.merkleRoot()).to.eql('0x20c3c4a0b09ea2af81868ec8e88c1ffdeee3cd08eaaa256e7b9e4e16728fbb35');
  });

  it('should allow to serialze and deserialize block to/from json.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(value, ADDR, 1337)],
    );

    transfer.sign([PRIV]);

    const block = new Block(height, {
      timestamp: Math.round(Date.now() / 1000),
      txs: [transfer],
    });
    // toJSON
    const json = block.toJSON();
    expect(json).to.eql({
      height: 123000044,
      timestamp: block.timestamp,
      txs: [transfer.toJSON()],
    });
    // fromJSON
    assert.deepEqual(Block.fromJSON(json), block);
    assert.deepEqual(Block.fromRaw(block.toRaw()), block);
  });
});
