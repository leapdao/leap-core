import { assert } from 'chai';
import Output from './output';

const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('Output', () => {
  beforeEach(() => {
  });

  it('should allow to create output from json', () => {
    const output = new Output({ address: ADDR, value: 11 });
    assert.equal(output.value, 11);
    assert.equal(output.address, ADDR);
    assert.deepEqual(output.toJSON(), {
      value: 11,
      address: ADDR,
    });
  });

  it('should allow to decode from raw', () => {
    const outputBuff = new Buffer('0000000005e69ec082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    const output = Output.fromRaw(outputBuff);
    assert.deepEqual(output.toJSON(), {
      value: 99000000,
      address: ADDR,
    });
  });

  it('should allow to encode to raw', () => {
    const output = new Output({
      value: 99000000,
      address: ADDR,
    });
    assert.equal(
      output.toRaw().toString('hex'),
      '0000000005e69ec082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
    );
  });
});
