import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import Block from './block';
import Tx from './transaction';

chai.use(sinonChai);

const EMPTY = '0x0000000000000000000000000000000000000000000000000000000000000000';
const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('blocks', () => {
  it('should allow to create and sign block header.', (done) => {
    const parent = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const height = 123;
    const merkleRoot = '0xaad47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af404cc';
    const block = new Block(parent, height, merkleRoot);
    block.sign(PRIV);
    // test hashing
    expect(block.hash()).to.eql('0xed02f7e3209df544a1c3d8d7a9698bcfa0f36578ea004deb1ad65f72db5c9e4a');

    // create proof
    const value = 50000000;
    const deposit = new Tx().deposit(5789, value, ADDR);
    const proof = block.proof(deposit.buf(), 0, [EMPTY]);
    expect(proof).to.eql([
      '0xed02f7e3209df544a1c3d8d7a9698bcfa0f36578ea004deb1ad65f72db5c9e4a',
      '0xed1cfa46bab764688ba8e1b9546a13108652d901c32ff52a4f2ed9c78c44d93d',
      '0x5c4e351b18dce8b89cb35599d63019bd910c3d548540ef14d51f4816827104d9',
      '0x000500210000000000000000001c000000000000000000000000000000000002',
      '0x0000169d0000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });
});
