import { assert, expect } from 'chai';
import Output from './output';

const ADDR = '82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';
const ROOT = '1111111222222233333333344444444445555555666666677777788888889999';

describe('Output', () => {
  beforeEach(() => {
  });

  it('should allow to create output from json', () => {
    const output = new Output({ address: `0x${ADDR}`, value: 11, color: 1337 });
    assert.equal(output.value, 11);
    assert.equal(output.color, 1337);
    assert.equal(output.address, `0x${ADDR}`);
    assert.deepEqual(output.toJSON(), {
      value: 11,
      color: 1337,
      address: `0x${ADDR}`,
    });
  });

  it('should allow to decode from raw transfer', () => {
    const outputBuff = Buffer.from('0000000005e69ec0053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    const output = Output.fromRaw(outputBuff);
    assert.deepEqual(output.toJSON(), {
      value: 99000000,
      color: 1337,
      address: `0x${ADDR}`,
    });
  });

  it('should allow to decode from raw computation request output', () => {
    const outputBuff = Buffer.from('0000000005e69ec0053900000000001482e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    const output = Output.fromRaw(outputBuff, 0, 1);
    assert.deepEqual(output.toJSON(), {
      value: 99000000,
      color: 1337,
      gasPrice: 0,
      msgData: `0x${ADDR}`,
    });
  });

  it('should allow to decode from raw computation response output', () => {
    const outputBuff = Buffer.from(`0000000005e69ec0053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f${ROOT}`, 'hex');
    const output = Output.fromRaw(outputBuff, 0, 2);
    assert.deepEqual(output.toJSON(), {
      value: 99000000,
      color: 1337,
      address: `0x${ADDR}`,
      storageRoot: `0x${ROOT}`,
    });
  });

  it('should fail on invalid msgData length', () => {
    const outputBuff = Buffer.from('0000000005e69ec0053900000000002082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    expect(Output.fromRaw.bind(Output, outputBuff, 0, 1)).to.throw('Length out of bounds.');
  });

  it('should allow to encode to raw transfer output', () => {
    const output = new Output({
      value: 99000000,
      color: 1337,
      address: `0x${ADDR}`,
    });
    assert.equal(
      output.toRaw().toString('hex'),
      '0000000005e69ec0053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
    );
  });

  it('should allow to encode to raw computation request output', () => {
    const output = new Output({
      value: 99000000,
      color: 1337,
      gasPrice: 9900000,
      msgData: `0x${ADDR}`,
    });
    assert.equal(
      output.toRaw().toString('hex'),
      `0000000005e69ec0053900970fe00014${ADDR}`,
    );
  });

  it('should allow to encode to short raw computation request output', () => {
    const output = new Output({
      value: 99000000,
      color: 1337,
      gasPrice: 9900000,
      msgData: '0x1234',
    });
    assert.equal(
      output.toRaw().toString('hex'),
      '0000000005e69ec0053900970fe000021234',
    );
  });

  it('should allow to encode to raw computation response output', () => {
    const output = new Output({
      value: 99000000,
      color: 1337,
      address: `0x${ADDR}`,
      storageRoot: ROOT,
    });
    assert.equal(
      output.toRaw().toString('hex'),
      `0000000005e69ec00539${ADDR}${ROOT}`,
    );
  });
});
