import chai, { expect, assert } from 'chai';
import sinonChai from 'sinon-chai';
import Util from './util';

chai.use(sinonChai);

const byteStr = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';

describe('util', () => {
  it('should allow to create and parse coinbase tx.', (done) => {
  	assert(Util.isBytes(byteStr));
  	assert(Util.isBytes32(byteStr));
  	assert(Util.isBytes32(byteStr.replace('0x', '')));
  	assert(!Util.isBytes32('0x12'));
  	done();
  });
});
