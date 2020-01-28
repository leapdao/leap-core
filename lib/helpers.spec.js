import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { bi } from 'jsbi-utils';

import Tx from './transaction';
import Outpoint from './outpoint';
import Output from './output';
import {
  getTxWithYoungestBlock,
  getYoungestInputTx,
  periodBlockRange,
  consolidateUTXOs,
  getProof,
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
    [new Output(10, ADDR_1, 0)]
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

  describe('consolidateUTXOs', () => {
    it('consolidates 0 utxos', () => {
      const utxos = [];
      const consolidates = consolidateUTXOs(utxos);
      expect(consolidates.length).to.eq(0);
    });

    it('consolidates < 15 utxos', () => {
      const utxos = Array.from({ length: 10 }, (_, i) => ({
        outpoint: new Outpoint(prevTx, i),
        output: new Output(100, ADDR_1, 0),
      }));

      const consolidates = consolidateUTXOs(utxos);

      expect(consolidates.length).to.eq(1);
      expect(consolidates[0].outputs.length).to.eq(1);
      expect(consolidates[0].outputs[0].address).to.eq(ADDR_1);
      expect(consolidates[0].outputs[0].color).to.eq(0);
      expect(consolidates[0].outputs[0].value).to.deep.eq(bi(1000));
    });

    it('consolidates === 15 utxos', () => {
      const utxos = Array.from({ length: 15 }, (_, i) => ({
        outpoint: new Outpoint(prevTx, i),
        output: new Output(100, ADDR_1, 0),
      }));

      const consolidates = consolidateUTXOs(utxos);

      expect(consolidates.length).to.eq(1);
      expect(consolidates[0].outputs.length).to.eq(1);
      expect(consolidates[0].outputs[0].address).to.eq(ADDR_1);
      expect(consolidates[0].outputs[0].color).to.eq(0);
      expect(consolidates[0].outputs[0].value).to.deep.eq(bi(1500));
    });

    it('consolidates > 15 utxos', () => {
      const utxos = Array.from({ length: 20 }, (_, i) => ({
        outpoint: new Outpoint(prevTx, i),
        output: new Output(100, ADDR_1, 0),
      }));

      const consolidates = consolidateUTXOs(utxos);

      expect(consolidates.length).to.eq(2);
      expect(consolidates[0].outputs.length).to.eq(1);
      expect(consolidates[0].outputs[0].address).to.eq(ADDR_1);
      expect(consolidates[0].outputs[0].color).to.eq(0);
      expect(consolidates[0].outputs[0].value).to.deep.eq(bi(1500));

      expect(consolidates[1].outputs.length).to.eq(1);
      expect(consolidates[1].outputs[0].address).to.eq(ADDR_1);
      expect(consolidates[1].outputs[0].color).to.eq(0);
      expect(consolidates[1].outputs[0].value).to.deep.eq(bi(500));
    });

    it('should throw for multiple colors', () => {
      const utxos = Array.from({ length: 20 }, (_, i) => ({
        outpoint: new Outpoint(prevTx, i),
        output: new Output(100, ADDR_1, i),
      }));

      expect(() => {
        consolidateUTXOs(utxos);
      }).to.throw('Expected UTXOs only for one color, got 20');
    });

    it('should throw for multiple addresses', () => {
      const utxos = Array.from({ length: 20 }, (_, i) => ({
        outpoint: new Outpoint(prevTx, i),
        output: new Output(100, i % 2 ? ADDR_1 : ADDR_2, 0),
      }));

      expect(() => {
        consolidateUTXOs(utxos);
      }).to.throw('Expected UTXOs only for one address, got 2');
    });
  });

  describe('getProof', () => {
    it('no period data for the height', async () => {
      const value = 50000000;
      const color = 1337;
      const deposit1 = Tx.deposit(0, value, ADDR_1, color);

      const plasma = {
        getBlock: n => {
          expect(n).to.be.within(0, 32);
          const transactions = n === 4 ? [{ raw: deposit1.hex() }] : [];
          return { number: n, timestamp: 123, transactions };
        },
        getPeriodByBlockHeight: () => Promise.resolve(null),
      };

      expect(
        getProof(plasma, { blockNumber: 4, raw: deposit1.hex() })
      ).to.eventually.throw(`No period data for the given tx. Height:4`);
    });

    it('no period data for the height, with fallback', async () => {
      const value = 50000000;
      const color = 1337;
      const deposit1 = Tx.deposit(0, value, ADDR_1, color);

      const plasma = {
        getBlock: n => {
          expect(n).to.be.within(0, 32);
          const transactions = n === 4 ? [{ raw: deposit1.hex() }] : [];
          return { number: n, timestamp: 123, transactions };
        },
        getPeriodByBlockHeight: () => Promise.resolve(null),
      };

      const periodOpts = {
        validatorData: { slotId: 0, ownerAddr: ADDR_1 },
        excludePrevHashFromProof: true,
      };

      const proof = getProof(
        plasma, 
        { blockNumber: 4, raw: deposit1.hex() },
        periodOpts
      );
      return expect(proof).to.eventually.eql([ 
        '0x29aa1b0213471dbf84175e8f688e5a63c2e5724ad6bc581a10b9521f4b8a6083',
        '0x4404003c00000000000000080000000000000000000000000000000000000000',
        '0x0000000002110000000000000000000000000000000000000000000000000000',
        '0x00000000000002faf08005394436373705394267350db2c06613990d34621d69',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0xad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb5',
        '0xb4c11951957c6f8f642c4af61cd6b24640fec6dc7fc607ee8206a99e92410d30',
        '0x21ddb9a356815c3fac1026b6dec5df3124afbadb485c9ba5a3e3398a04b7ba85',
        '0xe58769b32a1beaf1ea27375a44095a0d1fb664ce2dd358e7fcbfb78c26a19344',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x99ed61756087b72bef3d352ea237450df3d0749dd2e39615b8f8e993370f4ae9'
      ]);
    });

    it('should get CAS proof', async () => {
      const value = 50000000;
      const color = 1337;
      const deposit1 = Tx.deposit(0, value, ADDR_1, color);

      const casBitmap =
        '0x4000000000000000000000000000000000000000000000000000000000000000';
      const plasma = {
        getBlock: n => {
          expect(n).to.be.within(0, 32);
          const transactions = n === 4 ? [{ raw: deposit1.hex() }] : [];
          return { number: n, timestamp: 123, transactions };
        },
        getPeriodByBlockHeight: n => {
          expect(n).to.be.equal(4);
          return Promise.resolve({ slotId: 0, ownerAddr: ADDR_1, casBitmap });
        },
      };

      const proof = getProof(
        plasma, 
        { blockNumber: 4, raw: deposit1.hex() },
        { excludePrevHashFromProof: true }
      );
      return expect(proof).to.eventually.eql([
        '0x6eefe22ae29bc837d66e743334a70ecc19635c3c9ef31d4c2987b337b9d015c6',
        '0x4404003c00000000000000080000000000000000000000000000000000000000',
        '0x0000000002110000000000000000000000000000000000000000000000000000',
        '0x00000000000002faf08005394436373705394267350db2c06613990d34621d69',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0xad3228b676f7d3cd4284a5443f17f1962b36e491b30a40b2405849e597ba5fb5',
        '0xb4c11951957c6f8f642c4af61cd6b24640fec6dc7fc607ee8206a99e92410d30',
        '0x21ddb9a356815c3fac1026b6dec5df3124afbadb485c9ba5a3e3398a04b7ba85',
        '0xe58769b32a1beaf1ea27375a44095a0d1fb664ce2dd358e7fcbfb78c26a19344',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0xce66be6d62350d88a9edfd6b4a67eac3d06e8846583ff5a56d939dd20cdbf6cb',
      ]);
    });
  });
});
