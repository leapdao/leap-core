import { assert, expect } from 'chai';
import { BigInt } from 'jsbi';
import Output, { MAX_COLOR } from './output';

const ADDR = '82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('Output', () => {
  beforeEach(() => {
  });

  it('should allow to create output from json', () => {
    const output = new Output({ address: `0x${ADDR}`, value: 11, color: 1337 });
    assert.equal(output.value, 11);
    assert.equal(output.color, 1337);
    assert.equal(output.address, `0x${ADDR}`);
    assert.deepEqual(output.toJSON(), {
      value: '11',
      color: 1337,
      address: `0x${ADDR}`,
    });
  });

  it('should allow to decode from raw transfer', () => {
    const outputBuff = Buffer.from('0000000000000000000000000000000000000000000000001bc16d674ec80000053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    const output = Output.fromRaw(outputBuff);
    assert.deepEqual(output.toJSON(), {
      value: '2000000000000000000',
      color: 1337,
      address: `0x${ADDR}`,
    });
  });

  it('should allow to encode to raw transfer output', () => {
    const output = new Output({
      value: BigInt('2000000000000000000'),
      color: 1337,
      address: `0x${ADDR}`,
    });
    assert.equal(
      output.toRaw().toString('hex'),
      '0000000000000000000000000000000000000000000000001bc16d674ec80000053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
    );
  });

  it('should work with very small values', () => {
    const output = new Output({
      value: 2000000000000000000,
      color: 1337,
      address: `0x${ADDR}`,
    });
    assert.equal(
      output.toRaw().toString('hex'),
      '0000000000000000000000000000000000000000000000001bc16d674ec80000053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
    );
  });

  it('should allow to encode to raw transfer output (NFT)', () => {
    const output = new Output({
      value: '3376257227242927562249',
      color: (2 ** 15) + 1,
      address: `0x${ADDR}`,
    });
    assert.equal(
      output.toRaw().toString('hex'),
      '0000000000000000000000000000000000000000000000b706fb3c0000001e09800182e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
    );
  });

  it('should allow to decode raw transfer output (NFT)', () => {
    const output = new Output({
      value: '3376257227242927562249',
      color: (2 ** 15) + 1,
      address: `0x${ADDR}`,
    });
    assert.deepEqual(
      output,
      Output.fromRaw(output.toRaw()),
    );
  });

  it('should throw if color < 0', () => {
    expect(
      () => (
        new Output({
          value: '3376257227242927562249',
          color: -1,
          address: `0x${ADDR}`,
        })
      ),
    ).to.throw('Color out of range');
  });

  it('should throw if color > MAX_COLOR', () => {
    expect(
      () => (
        new Output({
          value: '3376257227242927562249',
          color: MAX_COLOR + 1,
          address: `0x${ADDR}`,
        })
      ),
    ).to.throw('Color out of range');
  });
});
