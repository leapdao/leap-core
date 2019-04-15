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
    expect(block.merkleRoot()).to.eql('0x1e91d4829cd099f3784050bc5f649b07587ce359441bfe8de9c5675478ee195d');
    // test hashing
    expect(block.hash()).to.eql('0x5576e4ce2b339f20b83ffc4fa1f581a69e8cb40a2df04068313939f08e5a3f8e');

    // create proof

    const proof = block.proof(transfer);
    expect(proof).to.eql([
      '0x1e91d4829cd099f3784050bc5f649b07587ce359441bfe8de9c5675478ee195d',
      '0x4607009a00000000000000000000000000000000000000000000000000000000',
      '0x00000000000003114920616d207665727920616e6772792c2062757420697420',
      '0x7761732066756e2100e803d55f228344d0f1ffbde493aa909eab846ec384b331',
      '0x86c3dabc6740d2fd4c316457c01e0e1d0746660b949269d51705083af488c120',
      '0xd2f3570741b095c1521b00000000000000000000000000000000000000000000',
      '0x00000000000002faf080000082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should allow to create block with multiple transactions.', () => {
    const parent = '0x4920616d207665727920616e6772792c20627574206974207761732066756e21';
    const height = 1;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(parent, 0))],
      [new Output(50000000, ADDR)],
    );
    transfer.sign([PRIV]);

    const condition = Tx.spendCond(
      [new Input({
        prevout: new Outpoint(parent, 1),
        script: '0x123456',
        gasPrice: 0,
      })],
      [new Output(10000000, ADDR)],
    );
    condition.inputs[0].setMsgData('0xaabbcc');

    const block = new Block(height);
    block.addTx(transfer);
    block.addTx(condition);

    expect(block.merkleRoot()).to.eql('0xa57da2ba11aacd5a90f127f6d76b06118eb380de3eb5e8bb8619d52dcdaa8bb4');
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

    const condition = Tx.spendCond(
      [new Input({
        prevout: new Outpoint(prevTx, 1),
        script: '0x123456',
        gasPrice: 0,
      })],
      [new Output(10000000, ADDR, 0)],
    );
    condition.inputs[0].setMsgData('0xaabbcc');

    const block = new Block(height, {
      timestamp: Math.round(Date.now() / 1000),
      txs: [transfer, condition],
    });
    // toJSON
    const json = block.toJSON();
    expect(json).to.eql({
      height: 123000044,
      timestamp: block.timestamp,
      txs: [transfer.toJSON(), condition.toJSON()],
    });
    // fromJSON
    assert.deepEqual(Block.fromJSON(json), block);
    assert.deepEqual(Block.fromRaw(block.toRaw()), block);
  });

  it('should allow to serialze and deserialize block to/from json with NSTs.', () => {
    const NSTColor = (2 ** 15) + (2 ** 14) + 1;
    const tokenId = '3376257227242927562249';
    const storageRoot = '0x0101010101010101010101010101010101010101010101010101010101010101';
    const prevTx = '0x7777777777777777777777777777777777777777777777777777777777777777';
    const height = 123000044;
    const transfer = Tx.transfer(
      [new Input(new Outpoint(prevTx, 0))],
      [new Output(tokenId, ADDR, NSTColor, storageRoot)],
    );
    transfer.sign([PRIV]);

    const condition = Tx.spendCond(
      [new Input({
        prevout: new Outpoint(prevTx, 1),
        script: '0x123456',
        gasPrice: 0,
      })],
      [new Output(10000000, ADDR, 0)],
    );
    condition.inputs[0].setMsgData('0xaabbcc');

    const block = new Block(height, {
      timestamp: Math.round(Date.now() / 1000),
      txs: [transfer, condition],
    });
    // toJSON
    const json = block.toJSON();
    expect(json).to.eql({
      height: 123000044,
      timestamp: block.timestamp,
      txs: [transfer.toJSON(), condition.toJSON()],
    });
    // fromJSON
    assert.deepEqual(Block.fromJSON(json), block);
    assert.deepEqual(Block.fromRaw(block.toRaw()), block);
    assert.equal(Block.fromRaw(block.toRaw()).txList[0].outputs[0].data, storageRoot);
  });
});
