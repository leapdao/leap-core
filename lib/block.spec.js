import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
import Block from './block';
import Tx from './transaction';

chai.use(sinonChai);

const EMPTY = '0x0000000000000000000000000000000000000000000000000000000000000000';
const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('blocks', () => {
  it('should allow to create and sign block with coinbase.', (done) => {
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
      '0x8305001d0000000000000000001c000000000000000000000000000000000000',
      '0x000000010000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should disallow duplicated transactions.', (done) => {
    const parent = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const height = 123;
    const value = 50000000;
    const coinbase = new Tx().coinbase(value, ADDR);
    const block = new Block(parent, height);
    block.addTx(coinbase);

    expect(() => {
      block.addTx(coinbase);
    }).to.throw('tx already contained');

    done();
  });

  it('should allow to create and sign block with deposit.', (done) => {
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
      '0x7f0500210000000000000000001c000000000000000000000000000000000002',
      '0x0000169d0000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should allow to create and sign block with transfer.', (done) => {
    const parent = '0x4920616d207665727920616e6772792c20627574206974207761732066756e21';
    const height = 1;
    const value = 50000000;
    let transfer = new Tx(height).transfer([{
      prevTx: parent,
      outPos: 0,
    }], [{
      value,
      addr: ADDR,
    }]);
    transfer = transfer.sign([PRIV]);

    const block = new Block(parent, height);
    block.addTx(transfer);
    expect(block.merkleRoot()).to.eql('0xd521128e00d2ea5d5568e90b130f1629fa8b99b15b5e8ff3bdf92908a9bf121c');
    block.sign(PRIV);
    // test hashing
    expect(block.hash()).to.eql('0xf95dc5d54e5bb98a8633b5065a696699f32a8e1c82cf8a35497d089e16a12b25');

    // create proof

    const proof = block.proof(transfer.buf(), 0, [EMPTY]);
    expect(proof).to.eql([
      '0xf95dc5d54e5bb98a8633b5065a696699f32a8e1c82cf8a35497d089e16a12b25',
      '0x62fa19ec25ec7fcab47ef7fb4ca1ddd9e038fd8abc72d771bd39933e1e07bc32',
      '0x6bae2138b402dd342ef5a856588edc0f634d3bd1e837e9d14861b9a9657c10e3',
      '0x780800880000000000000000001b000000000000000000000300000000000000',
      '0x01114920616d207665727920616e6772792c2062757420697420776173206675',
      '0x6e21008e396b830137867b55698f1470df40851f8a7c49321962445e03b31820',
      '0xfa6a302d97f5f6c5d3efaf8f728d6ddb16ddf616ec7297b763b7e95800b4e616',
      '0x21bd5d1b0000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });
});
