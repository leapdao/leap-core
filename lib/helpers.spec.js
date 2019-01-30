import 'babel-polyfill';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import ethUtil from 'ethereumjs-util';
import { BigInt, equal } from 'jsbi-utils';

import Tx from './transaction';
import Outpoint from './outpoint';
import Output from './output';
import {
  calcInputs,
  calcOutputs,
  getTxWithYoungestBlock,
  getYoungestInputTx,
  periodBlockRange,
} from './helpers';
import Input from './input';

const { expect } = chai;
chai.use(chaiAsPromised);

const bigEqual = (a, b) => equal(a, BigInt(b));

describe('helpers', () => {
  const ADDR_1 = '0x4436373705394267350db2c06613990d34621d69';
  const ADDR_2 = '0x8ab21c65041778dfc7ec7995f9cdef3d5221a5ad';

  const deposit1 = Tx.deposit(1, 100, ADDR_1);
  const deposit2 = Tx.deposit(2, 200, ADDR_1);
  const unspent = [
    { output: deposit1.outputs[0], outpoint: new Outpoint(deposit1.hash(), 0) },
    { output: deposit2.outputs[0], outpoint: new Outpoint(deposit2.hash(), 0) },
  ];

  const prevTx =
    '0x7777777777777777777777777777777777777777777777777777777777777777';

  const transfer = Tx.transfer(
    [new Input(new Outpoint(prevTx, 0)), new Input(new Outpoint(prevTx, 1))],
    [new Output(10, ADDR_1, 0)],
  );

  const tx1 = {
    hash: '0x6789',
    from: ADDR_1,
    to: ADDR_2,
    value: 100,
    transactionIndex: 1,
    blockHash: '0x123',
    blockNumber: '0x01',
    raw: '0x12345',
  };

  const tx2 = {
    hash: '0x8888',
    from: ADDR_1,
    to: ADDR_2,
    value: 100,
    transactionIndex: 2,
    blockHash: '0x123456',
    blockNumber: '0x02',
    raw: '0x12345',
  };

  describe('calcInputs', () => {
    it('should throw with empty unspent', async () => {
      expect(() => calcInputs([], ADDR_1, 100)).to.throw('Not enough inputs');
    });

    it('should return inputs with exact amount', async () => {
      const inputs1 = calcInputs(unspent, ADDR_1, 100);
      expect(inputs1.length).to.eq(1);
      expect(ethUtil.bufferToHex(inputs1[0].prevout.hash)).to.eq(
        deposit1.hash(),
      );
      expect(inputs1[0].prevout.index).to.eq(0);

      const inputs2 = calcInputs(unspent, ADDR_1, 300);
      expect(inputs2.length).to.eq(2);
      expect(ethUtil.bufferToHex(inputs1[0].prevout.hash)).to.eq(
        deposit1.hash(),
      );
      expect(inputs2[0].prevout.index).to.eq(0);
      expect(ethUtil.bufferToHex(inputs2[1].prevout.hash)).to.eq(
        deposit2.hash(),
      );
      expect(inputs2[1].prevout.index).to.eq(0);
    });

    it('should return inputs with remains', async () => {
      const inputs1 = calcInputs(unspent, ADDR_1, 50);
      expect(inputs1.length).to.eq(1);
      expect(ethUtil.bufferToHex(inputs1[0].prevout.hash)).to.eq(
        deposit1.hash(),
      );

      const inputs2 = calcInputs(unspent, ADDR_1, 150);
      expect(inputs2.length).to.eq(2);
      expect(ethUtil.bufferToHex(inputs2[0].prevout.hash)).to.eq(
        deposit1.hash(),
      );
      expect(ethUtil.bufferToHex(inputs2[1].prevout.hash)).to.eq(
        deposit2.hash(),
      );
    });
  });

  describe('calcOutputs', () => {
    it('should throw with empty unspent', async () => {
      expect(() => calcOutputs([])).to.throw('Unspent is empty');
    });

    it('should throw with not enough inputs', async () => {
      const inputs = [new Input(unspent[0].outpoint)];
      expect(() => calcOutputs(unspent, inputs, ADDR_1, ADDR_2, 120)).to.throw(
        'Not enough inputs'
      );
    });

    it('should return one output for exact inputs amount', () => {
      const inputs1 = calcInputs(unspent, ADDR_1, 100);
      const outputs1 = calcOutputs(unspent, inputs1, ADDR_1, ADDR_2, 100);
      expect(outputs1.length).to.eq(1);
      expect(outputs1[0].address).to.eq(ADDR_2);
      expect(bigEqual(outputs1[0].value, 100));

      const inputs2 = calcInputs(unspent, ADDR_1, 300);
      const outputs2 = calcOutputs(unspent, inputs2, ADDR_1, ADDR_2, 300);
      expect(outputs2.length).to.eq(1);
      expect(outputs2[0].address).to.eq(ADDR_2);
      expect(bigEqual(outputs2[0].value, 300));
    });

    it('should return two outputs for inputs with remains from one account', () => {
      const inputs1 = calcInputs(unspent, ADDR_1, 50);
      const outputs1 = calcOutputs(unspent, inputs1, ADDR_1, ADDR_2, 50);
      expect(outputs1.length).to.eq(2);
      expect(outputs1[0].address).to.eq(ADDR_2);
      expect(bigEqual(outputs1[0].value, 50));
      expect(outputs1[1].address).to.eq(ADDR_1);
      expect(bigEqual(outputs1[1].value, 50));

      const inputs2 = calcInputs(unspent, ADDR_1, 150);
      const outputs2 = calcOutputs(unspent, inputs2, ADDR_1, ADDR_2, 150);
      expect(outputs2.length).to.eq(2);
      expect(outputs2[0].address).to.eq(ADDR_2);
      expect(bigEqual(outputs1[0].value, 150));
      expect(outputs2[1].address).to.eq(ADDR_1);
      expect(bigEqual(outputs1[1].value, 150));
    });
  });

  describe('getTxWithYoungestBlock', () => {
    it('should return tx with the biggest block height', () => {
      expect(getTxWithYoungestBlock([tx1, tx2])).to.eql({
        index: 1,
        tx: tx2,
      });
    });
  });

  describe('getYoungestInputTx', async () => {
    it('should return input connected to tx with the biggest block height', () => {
      const plasma = {
        eth: {
          getTransaction: () => Promise.resolve(tx2),
        },
      };
      return expect(getYoungestInputTx(plasma, transfer)).to.eventually.eql({
        index: 0,
        tx: tx2,
      });
    });
  });

  describe('periodBlockRange', () => {
    it('block 31 → period 0 [0-31]', () => {
      expect(periodBlockRange(31)).to.deep.eq([0, 31]);
    });

    it('block 32 → period 1 [32-63]', () => {
      expect(periodBlockRange(32)).to.deep.eq([32, 63]);
    });

    it('block 33 → period 1 [32-63]', () => {
      expect(periodBlockRange(33)).to.deep.eq([32, 63]);
    });
  });
});
