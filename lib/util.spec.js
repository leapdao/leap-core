import { assert } from 'chai';
import Util from './util';

const byteStr = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';

describe('util', () => {
  it('should allow to create and parse coinbase tx.', () => {
    assert(Util.isBytes(byteStr));
    assert(Util.isBytes32(byteStr));
    assert(Util.isBytes32(byteStr.replace('0x', '')));
    assert(!Util.isBytes32('0x12'));
  });

  it('serialization', () => {
    const obj = {
      a: 1,
      b: 'qwe',
      c: {
        big: 10000000000000n
      }
    };
    const jsonStr = Util.toJSON(obj);
    assert.equal(
      jsonStr,
      '{\n  "a": 1,\n  "b": "qwe",\n  "c": {\n    "big": "10000000000000n"\n  }\n}'
    );

    assert.deepEqual(Util.fromJSON(jsonStr), obj);
  });
});
