import { assert } from 'chai';
import Input from './input';
import Outpoint from './outpoint';


describe('Input', () => {
  const hash = Buffer.from('7777777777777777777777777777777777777777777777777777777777777777', 'hex');
  let out1;
  beforeEach(() => {
    out1 = Outpoint.fromRaw(Buffer.from('777777777777777777777777777777777777777777777777777777777777777701', 'hex'));
  });

  it('should allow to create coinbase input', () => {
    const input = new Input();
    assert.equal(input.getSize(), 0);
    assert.deepEqual(input.toJSON(), {});
  });

  it('should allow to create deposit input', () => {
    const input = new Input(12);
    assert.equal(input.getSize(), 4);
    assert.deepEqual(input.toJSON(), {
      depositId: 12,
    });
  });

  it('should allow to create spend input', () => {
    const input = new Input(out1);
    assert.equal(input.getSize(), 33);
    assert.deepEqual(input.toJSON(), {
      hash: `0x${hash.toString('hex')}`,
      index: 1,
    });
    assert.equal(input.toRaw().toString('hex'), '777777777777777777777777777777777777777777777777777777777777777701');
  });

  it('should allow to create from raw', () => {
    const inputBuf = Buffer.from('03000000000754d4ec117777777777777777777777777777777777777777777777777777777777777777002e258a4ff440bc77f784792bbb3b3598709efd97198f1e59dc8f2c03ac20621d1783f9a1b58da8d00cbb8a58c12edc82725466f6421d3232369c236a4775f32b1c0000000005e69ec082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    const input = Input.fromRaw(inputBuf, 10);
    assert.deepEqual(input.toJSON(), {
      hash: `0x${inputBuf.slice(10, 42).toString('hex')}`,
      index: 0,
    });
  });
});
