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
    expect(block.merkleRoot()).to.eql('0x0ef7a31c7131aa418994b54606280ebf37b9b3df96ed3cc8a84b88db0051ceb5');
    // test hashing
    expect(block.hash()).to.eql('0x9f3ec7abe89100d4bdd76307fb3e4ac81f38162515914136b7a58bc2c9e64b44');

    // create proof

    const proof = block.proof(deposit);
    expect(proof).to.eql([
      '0x9f3ec7abe89100d4bdd76307fb3e4ac81f38162515914136b7a58bc2c9e64b44',
      '0x3c03002400000000000000000000000000000000000000000000000002110000',
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
      [new Input(new Outpoint(parent, 0))],
      [new Output(value, ADDR)],
    );

    transfer.sign([PRIV]);

    const block = new Block(height);
    block.addTx(transfer);
    expect(block.merkleRoot()).to.eql('0xf8272eadd13a33c457c93a1772f8857162df74f169245731735ba867dec04b13');
    // test hashing
    expect(block.hash()).to.eql('0x307adb7d81cf121c4f154061400d8bdc8f5a7eaeca1216c498234ed4fa1bb22d');

    // create proof

    const proof = block.proof(transfer);
    expect(proof).to.eql([
      '0x307adb7d81cf121c4f154061400d8bdc8f5a7eaeca1216c498234ed4fa1bb22d',
      '0x3e06008200000000000000000000000000000000000000000000000000000311',
      '0x4920616d207665727920616e6772792c20627574206974207761732066756e21',
      '0x0086d800270ca5aa8bc09942d8c76a55c3ff7555a8258e5d87bf6dff31d49713',
      '0xe65c24063a58fd4a6dc511d359e55a9655ba2b0bf3138e39810e1964cdbe53ba',
      '0xeb1b0000000002faf080000082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
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

    expect(block.merkleRoot()).to.eql('0x57e1da1cb8823f54abae6ec363a9122ba1982b4c0bd07aeaed03241a41476972');
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
