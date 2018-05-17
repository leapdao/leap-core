import { assert } from 'chai';
import Input from './input';
import Outpoint from './outpoint';


describe('Input', () => {
  const hash = new Buffer('7777777777777777777777777777777777777777777777777777777777777777', 'hex');
  let out1;
  beforeEach(() => {
    out1 = Outpoint.fromRaw(new Buffer('777777777777777777777777777777777777777777777777777777777777777701', 'hex'));
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
    assert.equal(input.getSize(), 98);
    assert.deepEqual(input.toJSON(), {
      hash,
      index: 1,
    });
    assert.equal(input.toRaw().toString('hex'), '7777777777777777777777777777777777777777777777777777777777777777010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');
    const signer = '0x1122334455667788990011223344556677889900';
    input.setSig(hash, hash, 27, signer);
    assert.deepEqual(input.toJSON(), {
      hash,
      index: 1,
      r: out1.txid(),
      s: out1.txid(),
      v: 27,
      signer,
    });
    assert.equal(input.toRaw().toString('hex'), '777777777777777777777777777777777777777777777777777777777777777701777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777771b');
  });

  it('should allow to create from raw', () => {
    const inputBuf = new Buffer('03000000000754d4ec117777777777777777777777777777777777777777777777777777777777777777002e258a4ff440bc77f784792bbb3b3598709efd97198f1e59dc8f2c03ac20621d1783f9a1b58da8d00cbb8a58c12edc82725466f6421d3232369c236a4775f32b1c0000000005e69ec082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    const sigHash = new Buffer('64ee1fed7e68f8e68d48fb41f6f36cf6c4a313e2e66fbe636a4e48b840d9a690', 'hex');
    const input = Input.fromRaw(inputBuf, 10, sigHash);
    assert.deepEqual(input.toJSON(), {
      hash: inputBuf.slice(10, 42),
      index: 0,
      r: '0x2e258a4ff440bc77f784792bbb3b3598709efd97198f1e59dc8f2c03ac20621d',
      s: '0x1783f9a1b58da8d00cbb8a58c12edc82725466f6421d3232369c236a4775f32b',
      v: 28,
      signer: '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
    });
  });
});
