import { expect } from 'chai';
import ethUtil from 'ethereumjs-util';

import Tx from './transaction';
import Outpoint from './outpoint';
import { calcInputs, calcOutputs } from './helpers';
import Input from './input';

describe('helpers', () => {
  const ADDR_1 = '0x4436373705394267350db2c06613990d34621d69';
  const ADDR_2 = '0x8ab21c65041778dfc7ec7995f9cdef3d5221a5ad';

  const deposit1 = Tx.deposit(1, 100, ADDR_1);
  const deposit2 = Tx.deposit(2, 200, ADDR_1);
  const unspent = [
    { output: deposit1.outputs[0], outpoint: new Outpoint(deposit1.hash(), 0) },
    { output: deposit2.outputs[0], outpoint: new Outpoint(deposit2.hash(), 0) },
  ];

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
      const inputs = [
        new Input(unspent[0].outpoint),
      ];
      expect(() => calcOutputs(unspent, inputs, ADDR_1, ADDR_2, 120))
        .to.throw('Not enough inputs');
    });

    it('should return one output for exact inputs amount', () => {
      const inputs1 = calcInputs(unspent, ADDR_1, 100);
      const outputs1 = calcOutputs(unspent, inputs1, ADDR_1, ADDR_2, 100);
      expect(outputs1.length).to.eq(1);
      expect(outputs1[0].address).to.eq(ADDR_2);
      expect(outputs1[0].value).to.eq(100);

      const inputs2 = calcInputs(unspent, ADDR_1, 300);
      const outputs2 = calcOutputs(unspent, inputs2, ADDR_1, ADDR_2, 300);
      expect(outputs2.length).to.eq(1);
      expect(outputs2[0].address).to.eq(ADDR_2);
      expect(outputs2[0].value).to.eq(300);
    });

    it('should return two outputs for inputs with remains from one account', () => {
      const inputs1 = calcInputs(unspent, ADDR_1, 50);
      const outputs1 = calcOutputs(unspent, inputs1, ADDR_1, ADDR_2, 50);
      expect(outputs1.length).to.eq(2);
      expect(outputs1[0].address).to.eq(ADDR_2);
      expect(outputs1[0].value).to.eq(50);
      expect(outputs1[1].address).to.eq(ADDR_1);
      expect(outputs1[1].value).to.eq(50);

      const inputs2 = calcInputs(unspent, ADDR_1, 150);
      const outputs2 = calcOutputs(unspent, inputs2, ADDR_1, ADDR_2, 150);
      expect(outputs2.length).to.eq(2);
      expect(outputs2[0].address).to.eq(ADDR_2);
      expect(outputs2[0].value).to.eq(150);
      expect(outputs2[1].address).to.eq(ADDR_1);
      expect(outputs2[1].value).to.eq(150);
    });
  });
});
