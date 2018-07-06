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
    expect(block.merkleRoot()).to.eql('0x54b0d82b5fe1b53253320710e44aaa3a19c04192b848b760e57c2e4229284062');
    // test hashing
    expect(block.hash()).to.eql('0xb1a119992ff3a42e895b597c9dd0f24bf6082a93f42646f6a09eec986af373dc');

    // create proof

    const proof = block.proof(deposit);
    expect(proof).to.eql([
      '0xb1a119992ff3a42e895b597c9dd0f24bf6082a93f42646f6a09eec986af373dc',
      '0x3d03002300000000000000000000000000000000000000000000000000020000',
      '0x169d0000000002faf080053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should allow to create block with transfer.', (done) => {
    const parent = '0x4920616d207665727920616e6772792c20627574206974207761732066756e21';
    const height = 1;
    const value = 50000000;
    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(parent, 0))],
      [new Output(value, ADDR)],
    );

    transfer.sign([PRIV]);

    const block = new Block(height);
    block.addTx(transfer);
    expect(block.merkleRoot()).to.eql('0x180c27763f182b89295066608cbd29e9528eff00826cdb4c7568d7bdfd588928');
    // test hashing
    expect(block.hash()).to.eql('0x54eb353cb880ebbf638eddcf34a9eacba2d4d3a4d93f166272d302254e3a71fd');

    // create proof

    const proof = block.proof(transfer);
    expect(proof).to.eql([
      '0x54eb353cb880ebbf638eddcf34a9eacba2d4d3a4d93f166272d302254e3a71fd',
      '0x3606008a00000000000000000000000000000000000003000000000000000111',
      '0x4920616d207665727920616e6772792c20627574206974207761732066756e21',
      '0x000ae97059c19165f11d898f47f0b8b9c46ddc36f9541e6615d80981f802e47e',
      '0x0b413762ad961728af62590c7af144de27fa6b8cd0e0845718760f57a27c1ce5',
      '0x0c1b0000000002faf080000082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should allow to create block with multiple transactions.', () => {
    const parent = '0x4920616d207665727920616e6772792c20627574206974207761732066756e21';
    const height = 1;
    const transfer1 = Tx.transfer(
      height,
      [new Input(new Outpoint(parent, 0))],
      [new Output(50000000, ADDR)],
    );

    const transfer2 = Tx.transfer(
      height,
      [new Input(new Outpoint(parent, 1))],
      [new Output(10000000, ADDR)],
    );

    transfer1.sign([PRIV]);
    transfer2.sign([PRIV]);

    const block = new Block(height);
    block.addTx(transfer2);
    block.addTx(transfer1);

    expect(block.merkleRoot()).to.eql('0xafe774c1eb8f1f2ca85022e6631d04aa0669d69ec77b5d793847ccdcc6e21abf');
  });

  it('should allow to serialze and deserialize block to/from json.', () => {
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const value = 99000000;
    const transfer = Tx.transfer(
      height,
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
