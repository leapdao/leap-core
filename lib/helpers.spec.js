import { expect } from 'chai';
import ethUtil from 'ethereumjs-util';

import Tx from './transaction';
import Outpoint from './outpoint';
import { makeTransferTxFromUnspent } from './helpers';

describe('helpers', () => {
  describe('makeTransferTxFromUnspent', () => {
    const ADDR_1 = '0x4436373705394267350db2c06613990d34621d69';
    const PRIV_1 =
      '0xad8e31c8862f5f86459e7cca97ac9302c5e1817077902540779eef66e21f394a';
    const ADDR_2 = '0x8ab21c65041778dfc7ec7995f9cdef3d5221a5ad';

    const deposit1 = Tx.deposit(1, 100, ADDR_1);
    const deposit2 = Tx.deposit(2, 200, ADDR_1);
    const unspent = [
      { output: deposit1.outputs[0], outpoint: new Outpoint(deposit1.hash(), 0) },
      { output: deposit2.outputs[0], outpoint: new Outpoint(deposit2.hash(), 0) },
    ];

    it('should return transfer tx with exact inputs amount', async () => {
      const transfer1 = makeTransferTxFromUnspent(unspent, ADDR_1, ADDR_2, 100);
      expect(transfer1.inputs.length).to.eq(1);
      expect(transfer1.outputs.length).to.eq(1);
      expect(ethUtil.bufferToHex(transfer1.inputs[0].prevout.hash)).to.eq(
        deposit1.hash(),
      );
      expect(transfer1.inputs[0].prevout.index).to.eq(0);
      expect(transfer1.outputs[0].address).to.eq(ADDR_2);
      expect(transfer1.outputs[0].value).to.eq(100);

      const transfer2 = makeTransferTxFromUnspent(unspent, ADDR_1, ADDR_2, 300);
      expect(transfer2.inputs.length).to.eq(2);
      expect(transfer2.outputs.length).to.eq(1);
      expect(ethUtil.bufferToHex(transfer1.inputs[0].prevout.hash)).to.eq(
        deposit1.hash(),
      );
      expect(transfer2.inputs[0].prevout.index).to.eq(0);
      expect(ethUtil.bufferToHex(transfer2.inputs[1].prevout.hash)).to.eq(
        deposit2.hash(),
      );
      expect(transfer2.inputs[1].prevout.index).to.eq(0);
      expect(transfer2.outputs[0].address).to.eq(ADDR_2);
      expect(transfer2.outputs[0].value).to.eq(300);
    });

    it('should return transfer tx with remains', async () => {
      const transfer1 = makeTransferTxFromUnspent(unspent, ADDR_1, ADDR_2, 50);
      expect(transfer1.inputs.length).to.eq(1);
      expect(transfer1.outputs.length).to.eq(2);
      expect(transfer1.outputs[0].address).to.eq(ADDR_2);
      expect(transfer1.outputs[0].value).to.eq(50);
      expect(transfer1.outputs[1].address).to.eq(ADDR_1);
      expect(transfer1.outputs[1].value).to.eq(50);

      const transfer2 = makeTransferTxFromUnspent(unspent, ADDR_1, ADDR_2, 150);
      expect(transfer2.inputs.length).to.eq(2);
      expect(transfer2.outputs.length).to.eq(2);
      expect(transfer2.outputs[0].address).to.eq(ADDR_2);
      expect(transfer2.outputs[0].value).to.eq(150);
      expect(transfer2.outputs[1].address).to.eq(ADDR_1);
      expect(transfer2.outputs[1].value).to.eq(150);
    });

    it('should return signed transfer tx', async () => {
      const transfer = makeTransferTxFromUnspent(unspent, ADDR_1, ADDR_2, 100, PRIV_1);
      expect(transfer.inputs.length).to.eq(1);
      expect(transfer.inputs[0].signer).to.eq(ADDR_1);
    });

    it('should return tx with given height', async () => {
      const transfer = makeTransferTxFromUnspent(unspent, ADDR_1, ADDR_2, 100, undefined, 100);
      expect(transfer.options.height).to.eq(100);
    });

    it('should throw with empty unspent', async () => {
      expect(() => makeTransferTxFromUnspent([], ADDR_1, ADDR_2, 100)).to.throw('Unspent is empty');
    });
  });
});
