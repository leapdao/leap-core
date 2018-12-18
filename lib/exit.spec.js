import { assert } from 'chai';
import util from 'ethereumjs-util';

import Exit from './exit';
import Tx from './transaction';
import Outpoint from './outpoint';

describe('exit', () => {
  const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
  const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

  const tx = Tx.deposit(12, 12, ADDR);
  const utxoId = (new Outpoint(tx.hash(), 0)).getUtxoId();
  const value = 1000;

  it('sigBuff is correct', () => {
    const sigBuff = Exit.sigHashBuff(utxoId, value);

    const sigBuffStr = sigBuff.toString('hex');
    const utxoIdStr = sigBuffStr.slice(0, 64);
    const valueStr = sigBuffStr.slice(64);

    assert.equal(`0x${utxoIdStr}`, utxoId);
    assert.equal(parseInt(`0x${valueStr}`, 16), value);
  });

  it('can recover signature', () => {
    const signedExit = Exit.signOverExit(utxoId, value, PRIV);

    const msg = signedExit.slice(0, 64);
    const msgHash = util.keccak256(msg);
    const r = signedExit.slice(64, 96);
    const s = signedExit.slice(96, 128);
    const v = parseInt(`0x${signedExit.slice(128).toString('hex')}`, 16);

    const pub = util.ecrecover(msgHash, v, r, s);
    assert.equal(ADDR, `0x${util.pubToAddress(pub).toString('hex')}`);
  });
});
