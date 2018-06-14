import { expect } from 'chai';
import Block from './block';
import Tx from './transaction';
import Input from './input';
import Output from './output';
import Outpoint from './outpoint';

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('blocks', () => {
  it('should allow to create block with coinbase.', (done) => {
    const parent = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const height = 123;
    const value = 50000000;
    const coinbase = Tx.coinbase(value, ADDR);
    const block = new Block(parent, height);
    block.addTx(coinbase);
    expect(block.merkleRoot()).to.eql('0x005c182aa34da44067f9ef389d181416477e03443e47ac3c653d637484eea93e');

    // test hashing
    expect(block.hash()).to.eql('0x58f1b2be1c444ac8b362a4f0be41190fdc41ab939059c50c9503a19fb07f414f');

    // create proof
    const proof = block.proof(coinbase);
    expect(proof).to.eql([
      '0x58f1b2be1c444ac8b362a4f0be41190fdc41ab939059c50c9503a19fb07f414f',
      '0x4303001d00000000000000000000000000000000000000000000000000000000',
      '0x000000010000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should disallow duplicated transactions.', (done) => {
    const parent = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const height = 123;
    const value = 50000000;
    const coinbase = Tx.coinbase(value, ADDR);
    const block = new Block(parent, height);
    block.addTx(coinbase);

    expect(() => {
      block.addTx(coinbase);
    }).to.throw('tx already contained');

    done();
  });

  it('should allow to create block with deposit.', (done) => {
    const parent = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const height = 123;
    const value = 50000000;
    const deposit = Tx.deposit(5789, value, ADDR);
    const block = new Block(parent, height);
    block.addTx(deposit);
    expect(block.merkleRoot()).to.eql('0x2c8204db55854297db711f29644643e5aacbbcf3655f48bc697c0978f16792e8');
    // test hashing
    expect(block.hash()).to.eql('0x5d8e46c3ead993fdf3500ec5969d14e12d7b04fed9c8255f634d67ea4a889b12');

    // create proof

    const proof = block.proof(deposit);
    expect(proof).to.eql([
      '0x5d8e46c3ead993fdf3500ec5969d14e12d7b04fed9c8255f634d67ea4a889b12',
      '0x3f03002100000000000000000000000000000000000000000000000000000002',
      '0x0000169d0000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should allow to create block with transfer.', (done) => {
    const parent = '0x4920616d207665727920616e6772792c20627574206974207761732066756e21';
    const height = 1;
    const value = 50000000;
    const transfer = Tx.transfer(
      height,
      [new Input(new Outpoint(parent, 0))],
      [new Output(value, ADDR)],
    );

    transfer.sign([PRIV]);

    const block = new Block(parent, height);
    block.addTx(transfer);
    expect(block.merkleRoot()).to.eql('0xd521128e00d2ea5d5568e90b130f1629fa8b99b15b5e8ff3bdf92908a9bf121c');
    // test hashing
    expect(block.hash()).to.eql('0x3ded879a2314998af69e69031c0b4fb54c96e8d3b7fa5ebf9b4fcfbfdc84821e');

    // create proof

    const proof = block.proof(transfer);
    expect(proof).to.eql([
      '0x3ded879a2314998af69e69031c0b4fb54c96e8d3b7fa5ebf9b4fcfbfdc84821e',
      '0x3806008800000000000000000000000000000000000000000300000000000000',
      '0x01114920616d207665727920616e6772792c2062757420697420776173206675',
      '0x6e21008e396b830137867b55698f1470df40851f8a7c49321962445e03b31820',
      '0xfa6a302d97f5f6c5d3efaf8f728d6ddb16ddf616ec7297b763b7e95800b4e616',
      '0x21bd5d1b0000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    ]);
    done();
  });

  it('should allow to create block with multiple transactions.', () => {
    const parent = '0x4920616d207665727920616e6772792c20627574206974207761732066756e21';
    const height = 1;
    const transfer1 = Tx.transfer(
      height,
      [new Input(new Outpoint(parent, 0))],
      [new Output(50000000, ADDR)],
    );

    const transfer2 = Tx.transfer(
      height,
      [new Input(new Outpoint(parent, 1))],
      [new Output(10000000, ADDR)],
    );

    transfer1.sign([PRIV]);
    transfer2.sign([PRIV]);

    const block = new Block(parent, height);
    block.addTx(transfer2);
    block.addTx(transfer1);

    expect(block.merkleRoot()).to.eql('0x57c48c160298cc1ff743a7cfc393d6053b5ef8d76a3e0eb68101154f12653ffe');
  });
});
