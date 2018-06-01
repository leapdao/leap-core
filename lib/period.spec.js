import { expect } from 'chai';
import Block from './block';
import Tx from './transaction';
import Period from './period';
import Input from './input';
import Output from './output';
import Outpoint from './outpoint';

const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

describe('periods', () => {
  it('should allow to get proof from period.', (done) => {
    const parent = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const height = 123;
    const value = 50000000;
    const coinbase = Tx.coinbase(value, ADDR);
    const deposit = Tx.deposit(1, value, ADDR);
    const block1 = new Block(parent, height);
    block1.addTx(coinbase);
    block1.addTx(deposit);
    block1.sign(PRIV);

    const block2 = new Block(block1.hash(), height+1);
    block2.addTx(Tx.coinbase(value * 2, ADDR));
    block2.sign(PRIV);

    const period = new Period([block1, block2]);
    const proof = period.proof(coinbase);
    expect(proof).to.eql([
      period.merkleRoot(),
      '0x8303001d00000000000000000000000000000000000000000000000000000000',
      '0x000000010000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0xfabe05855098262ad88f1d69d6c7202ae2f22988a7574462702823fe2d808d87',
      '0xc37923d20e65fca81d1d25e7e8b0bbb92d859e1dabcccd8f6306815be95cf02f'
    ]);
    done();
  });


  it('should allow to get proof from period non-trivial position.', (done) => {
    const parent = '0x86d47404ca93fc120792f082a5fcfcfdd09b3a05cd8d5ad7c85be7561af40418';
    const height = 123;
    const value = 50000000;
    const block1 = new Block(parent, height);
    block1.addTx(Tx.coinbase(value, ADDR));
    block1.addTx(Tx.deposit(1, value, ADDR));
    block1.addTx(Tx.deposit(2, value, ADDR));
    block1.sign(PRIV);

    const deposit = Tx.deposit(3, value, ADDR);
    const coinbase = Tx.coinbase(value * 2, ADDR);
    const block2 = new Block(block1.hash(), height+1);
    block2.addTx(coinbase);
    block2.addTx(deposit);
    block2.addTx(Tx.deposit(4, value, ADDR));
    block2.sign(PRIV);

    const block3 = new Block(block2.hash(), height+2);
    block3.addTx(Tx.coinbase(value * 3, ADDR));
    block3.addTx(Tx.deposit(5, value, ADDR));
    block3.addTx(Tx.deposit(6, value, ADDR));
    block3.sign(PRIV);

    const period = new Period([block1, block2, block3]);
    const proof = period.proof(deposit);
    expect(proof).to.eql([
      period.merkleRoot(),
      '0x7f03002100000000000000050000000000000000000000000000000000000002',
      '0x000000030000000002faf08082e8c6cf42c8d1ff9594b17a3f50e94a12cc860f',
      '0x176afc4dcb34e688845851ee94ebac73994ec2a0554ea1f2bbeb38cd70486aab',
      '0xcc7864d02b15d5c38663338b1050b851d4054f7b53ac4ee8d34d2ec99f3045ea',
      '0x05318213ecaf805a027f052b932338d77d5ade504fd8e5b60f92f6bae4b5b189',
      '0xa9d6638469f82e77078240d72139f13a7774408d303837cdab0d743a454c31a8'
    ]);
    done();
  });
});
