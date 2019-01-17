import { assert, expect } from 'chai';
import { BigInt, equal } from 'jsbi-utils';
import Output, { MAX_COLOR } from './output';

const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';
const ERC721color = (2 ** 15) + 1;
const longTokenId = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const tokenId = '3376257227242927562249';

const verifyOutput = (output, value, color, address) => {
  assert(equal(output.value, value));
  assert.equal(output.color, color);
  assert.equal(output.address, address);
  assert.deepEqual(output.toJSON(), {
    value: value.toString(10),
    color,
    address,
  });
};

describe('Output', () => {
  beforeEach(() => {
  });

  describe('create', () => {
    it('from json', () => {
      verifyOutput(new Output({ address: ADDR, value: 11, color: 1337 }), BigInt(11), 1337, ADDR);
    });

    it('from json, should disalow 0 bi', () => {
      expect(() => (new Output({ address: ADDR, value: BigInt(0), color: 1337 }))).to.throw();
    });

    it('from json, should disalow negative bi', () => {
      expect(() => (new Output({ address: ADDR, value: BigInt(-1), color: 1337 }))).to.throw();
    });

    it('from json, should disalow negative', () => {
      expect(() => (new Output({ address: ADDR, value: -1, color: 1337 }))).to.throw();
    });

    it('from json, should disalow 0', () => {
      expect(() => (new Output({ address: ADDR, value: 0, color: 1337 }))).to.throw();
    });

    it('from json (NFT)', () => {
      const output = new Output({ address: ADDR, value: longTokenId, color: ERC721color });
      verifyOutput(output, BigInt(longTokenId), ERC721color, ADDR);
    });

    it('from json > disallow Number for large values', () => {
      const value = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
      expect(() => (new Output({ value, color: 1337, address: ADDR}))).to.throw();
    });

    it('from json > big value > BigInt', () => {
      const value = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      verifyOutput(new Output({ address: ADDR, value, color: 1337 }), BigInt(value), 1337, ADDR);
    });
  
    it('from json > big value > hex string', () => {
      const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      verifyOutput(new Output({ address: ADDR, value, color: 1337 }), BigInt(value), 1337, ADDR);
    });

    it('from json > big value > dec string', () => {
      const value = '452312848583266388373324160190187140051835877600158453279131187530910662655';
      verifyOutput(new Output({ address: ADDR, value, color: 1337 }), BigInt(value), 1337, ADDR);
    });

    it('from args', () => {
      verifyOutput(new Output(11, ADDR, 1337), BigInt(11), 1337, ADDR);
    });

    it('from args (NFT)', () => {
      verifyOutput(new Output(longTokenId, ADDR, ERC721color), BigInt(longTokenId), ERC721color, ADDR);
    });

    it('from args > disallow Number for large values', () => {
      const value = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
      expect(() => (new Output(value, ADDR, 1337))).to.throw();
    });

    it('from args > big value > BigInt', () => {
      const value = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      verifyOutput(new Output(value, ADDR, 1337), BigInt(value), 1337, ADDR);
    });
  
    it('from args > big value > hex string', () => {
      const value = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      verifyOutput(new Output(value, ADDR, 1337), BigInt(value), 1337, ADDR);
    });

    it('from args > big value > dec string', () => {
      const value = '452312848583266388373324160190187140051835877600158453279131187530910662655';
      verifyOutput(new Output(value, ADDR, 1337), BigInt(value), 1337, ADDR);
    });

    it('should throw if color < 0', () => {
      const color = -1;
      expect(() => (new Output({ value: tokenId, color, address: ADDR }))).to.throw('Color out of range');
      expect(() => (new Output(tokenId, ADDR, color))).to.throw('Color out of range');
    });
  
    it('should throw if color > MAX_COLOR', () => {
      const color = MAX_COLOR + 1;
      expect(() => (new Output({ value: tokenId, color, address: ADDR }))).to.throw('Color out of range');
      expect(() => (new Output(tokenId, ADDR, color))).to.throw('Color out of range');
    });

  });

  it('should allow to decode from raw transfer', () => {
    const outputBuff = Buffer.from('0000000000000000000000000000000000000000000000001bc16d674ec80000053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    const output = Output.fromRaw(outputBuff);
    assert.deepEqual(output.toJSON(), {
      value: '2000000000000000000',
      color: 1337,
      address: ADDR,
    });
  });

  it('should allow to encode to raw transfer output', () => {
    const output = new Output({
      value: BigInt('2000000000000000000'),
      color: 1337,
      address: ADDR,
    });
    assert.equal(
      output.toRaw().toString('hex'),
      '0000000000000000000000000000000000000000000000001bc16d674ec80000053982e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
    );
  });

  it('should allow to encode to raw transfer output (NFT)', () => {
    const output = new Output({ value: tokenId, color: ERC721color, address: ADDR });
    assert.equal(
      output.toRaw().toString('hex'),
      '0000000000000000000000000000000000000000000000b706fb3c0000001e09800182e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
    );
  });

  it('should allow to decode raw transfer output (NFT)', () => {
    const output = new Output({ value: tokenId, color: ERC721color, address: ADDR });
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

  it('should throw if value is negative', () => {    
    expect(
      () => (
        new Output({
          value: -1,
          color: 0,
          address: `0x${ADDR}`,
        })
      ),
    ).to.throw('Value is < 1');
  });

  it('should throw if value is 0', () => {
    expect(
      () => (
        new Output({
          value: 0,
          color: 0,
          address: `0x${ADDR}`,
        })
      ),
    ).to.throw('Value is < 1');
  });

  it('should fail to decode from raw if value is 0', () => {
    const outputBuff = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000000082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f', 'hex');
    expect(Output.fromRaw(outputBuff)).to.throw('Value is < 1');
  });
});
