import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import Tx from './transaction';
import Outpoint from './outpoint';
import Output from './output';
import {
  getTxWithYoungestBlock,
  getYoungestInputTx,
  periodBlockRange,
} from './helpers';
import Input from './input';

const { expect } = chai;
chai.use(chaiAsPromised);


describe('helpers', () => {
  const ADDR_1 = '0x4436373705394267350db2c06613990d34621d69';
  const ADDR_2 = '0x8ab21c65041778dfc7ec7995f9cdef3d5221a5ad';


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
