import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import Block from './block';
import Tx from './transaction';

chai.use(sinonChai);

const EMPTY = '0x0000000000000000000000000000000000000000000000000000000000000000';
const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('blocks', () => {
  it('should allow to create and sign block header with coinbase.', (done) => {
    const parent = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const height = 123;
    const value = 50000000;
    const coinbase = new Tx().coinbase(value, ADDR);
    const block = new Block(parent, height);
    block.addTx(coinbase);
    expect(block.merkleRoot()).to.eql('0x005c182aa34da44067f9ef389d181416477e03443e47ac3c653d637484eea93e');
    block.sign(PRIV);
    // test hashing
    expect(block.hash()).to.eql('0x3b2c16344f43d5091059794ce3feebce662575f4acadcabde39ae8dedd2b535d');

    // create proof

    const proof = block.proof(coinbase.buf(), 0, [EMPTY]);
    expect(proof).to.eql([
      '0x3b2c16344f43d5091059794ce3feebce662575f4acadcabde39ae8dedd2b535d',
      '0x45a021854a72469af708bda0e01017375755407e20557843d5c4a1d53ef08ced',
      '0x275b17c2de7bed08a6e23daedb9c31decd733e362f3a2fe5173c6aac61d8d69b',
      '0x0005001d0000000000000000001c000000000000000000000000000000000000',
      '0x000000010000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should allow to create and sign block header.', (done) => {
    const parent = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const height = 123;
    const value = 50000000;
    const deposit = new Tx().deposit(5789, value, ADDR);
    const block = new Block(parent, height);
    block.addTx(deposit);
    expect(block.merkleRoot()).to.eql('0x2c8204db55854297db711f29644643e5aacbbcf3655f48bc697c0978f16792e8');
    block.sign(PRIV);
    // test hashing
    expect(block.hash()).to.eql('0x441370f1b6c5c064ca842a0434e86875fd389170ef0f6e70816f724ad6a6c7b9');

    // create proof

    const proof = block.proof(deposit.buf(), 0, [EMPTY]);
    expect(proof).to.eql([
      '0x441370f1b6c5c064ca842a0434e86875fd389170ef0f6e70816f724ad6a6c7b9',
      '0xd35115918b903fb104452178961c3480596b0b0a1b34d76ee9fd843229fc6a8a',
      '0x18c0fe728ad3c9ee0c52c0634232738b924098fd1ee5e3eb8d45960aaaf1e9a6',
      '0x000500210000000000000000001c000000000000000000000000000000000002',
      '0x0000169d0000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });  
});
