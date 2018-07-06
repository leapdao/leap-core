import { assert } from 'chai';
import Outpoint from './outpoint';
import Tx from './transaction';

const OUTPOINT_SIZE = 33;

describe('Outpoint', () => {
  let raw1;
  let tx1;
  let out1;
  beforeEach(() => {
    tx1 = Buffer.from('0311777777777777777777777777777777777777777777777777777777777777777700bf1c0887456f6ddf7fd45c1d3c8d09a00e85249f2eb998a6121717ac08b81d627fb8d91bf1323ecef665dab97acc27ed1c761eda23422b96b8eeaca317b5bda71b0000000005e69ec082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    raw1 = tx1.slice(2, 2 + OUTPOINT_SIZE);
    out1 = Outpoint.fromRaw(raw1);
  });

  it('should return a size of 36', () => {
    const tx = Tx.fromRaw(tx1);
    assert.deepEqual(out1.hash, tx.inputs[0].prevout.hash);
    assert.equal(out1.getSize(), OUTPOINT_SIZE);
    assert.equal(out1.hex(), '0x777777777777777777777777777777777777777777777777777777777777777700');
  });

  it('should create an outpoint from JSON', () => {
    const json = {
      hash: out1.txid(),
      index: out1.index,
    };
    const fromJSON = Outpoint.fromJSON(json);

    assert.deepEqual(out1, fromJSON);
  });

  it('should give utxoId', () => {
    const json = {
      hash: out1.txid(),
      index: 1,
    };
    const fromJSON = Outpoint.fromJSON(json);

    assert.deepEqual(fromJSON.getUtxoId(), '0x0000000000000000000000000000000001777777777777777777777777777777');
  });

  it('should give raw', () => {
    const json = {
      hash: out1.txid(),
      index: out1.index,
    };
    const fromJSON = Outpoint.fromJSON(json);
    assert.equal(fromJSON.toRaw().toString('hex'), '777777777777777777777777777777777777777777777777777777777777777700');
  });

  it('should allow to compare', () => {
    const fromJSON1 = Outpoint.fromJSON({
      hash: out1.txid(),
      index: 0,
    });
    const fromJSON2 = Outpoint.fromJSON({
      hash: out1.txid(),
      index: 1,
    });
    assert(fromJSON1.equals(fromJSON1));
    assert(!fromJSON1.equals(fromJSON2));
  });

  it('should instantiate an outpoint from a tx', () => {
    const tx = Tx.deposit(1, 50000000, '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 1337);
    const index = 0;
    const fromTX = Outpoint.fromTX(tx, index);

    assert.equal(fromTX.txid(), tx.hash('hex'));
    assert.equal(fromTX.index, index);
  });
});
