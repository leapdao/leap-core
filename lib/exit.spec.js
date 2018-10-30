import Exit from './exit';
import Tx from './transaction';
import Outpoint from './outpoint';

import { assert } from 'chai';
import util from 'ethereumjs-util';

describe('exit', () => {
    const PRIV = '0x94890218f2b0d04296f30aeafd13655eba4c5bbf1770273276fee52cbe3f2cb4';
    const ADDR = '0x82e8c6cf42c8d1ff9594b17a3f50e94a12cc860f';

    const tx = Tx.deposit(12, 12, ADDR);
    const utxoid = (new Outpoint(tx.hash(), 0)).getUtxoId();
    const value = 1000;

  it('sigBuff is correct', () => {
    const sigBuff = Exit.sigHashBuff(utxoid, value);
    
    const sigBuffString = sigBuff.toString('hex');
    const string_utxoid = sigBuffString.slice(0, 64);
    const string_value = sigBuffString.slice(64);

    assert.equal("0x" + string_utxoid, utxoid);
    assert.equal(parseInt("0x" + string_value), value);
  });

  it('can recover signature', () => {
    const signedExit = Exit.signOverExit(utxoid, value, PRIV);

    const msg = signedExit.slice(0, 64);
    const msgHash = util.keccak256(msg);
    const r = signedExit.slice(64, 96);
    const s = signedExit.slice(96, 128);
    const v = parseInt("0x" + signedExit.slice(128).toString('hex'));

    const pub = util.ecrecover(msgHash, v, r, s);
    assert.equal(ADDR, "0x" + util.pubToAddress(pub).toString('hex'));
  });
});