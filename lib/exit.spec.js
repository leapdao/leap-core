import { assert } from 'chai';
import util from 'ethereumjs-util';

import Exit from './exit';
import Tx from './transaction';
import Outpoint from './outpoint';
import Output from './output';
import Input from './input';
import Block from './block';
import Period from './period';

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

  it('can parse tx data from proof', () => {

    const alice = "0x83B3525e17F9eAA92dAE3f9924cc333c94C7E98a";
    const alicePriv = "0xbd54b17c48ac1fc91d5ef2ef02e9911337f8758e93c801b619e5d178094486cc";
    const exitHandler = "0x791186143a8fe5f0287f0DC35df3A71354f607b6";

    const deposit = Tx.deposit(0, 100, alice);
    let transfer = Tx.transfer(
        [new Input(new Outpoint(deposit.hash(), 0))],
        [new Output(50, exitHandler), new Output(50, alice)]
    );
    transfer = transfer.sign([alicePriv]);

    const block = new Block(33);
    block.addTx(deposit).addTx(transfer);

    const prevPeriodRoot = "0x32C220482C68413FBF8290E3B1E49B0A85901CFCD62AB0738760568A2A6E8A57";
    const period = new Period(prevPeriodRoot, [block]);

    const transferProof = period.proof(transfer);
    
    const txData = Exit.parseTxDataFromProof(transferProof);
    assert.equal(txData, transfer.toRaw().toString('hex'));
  });

  it('can construct tx from proof', () => {

    const alice = "0x83B3525e17F9eAA92dAE3f9924cc333c94C7E98a";
    const alicePriv = "0xbd54b17c48ac1fc91d5ef2ef02e9911337f8758e93c801b619e5d178094486cc";
    const exitHandler = "0x791186143a8fe5f0287f0DC35df3A71354f607b6";

    const deposit = Tx.deposit(0, 100, alice);
    let transfer = Tx.transfer(
        [new Input(new Outpoint(deposit.hash(), 0))],
        [new Output(50, exitHandler), new Output(50, alice)]
    );
    transfer = transfer.sign([alicePriv]);

    const block = new Block(33);
    block.addTx(deposit).addTx(transfer);

    const prevPeriodRoot = "0x32C220482C68413FBF8290E3B1E49B0A85901CFCD62AB0738760568A2A6E8A57";
    const period = new Period(prevPeriodRoot, [block]);

    const transferProof = period.proof(transfer);
    
    const tx = Exit.txFromProof(transferProof);

    assert.equal(tx.toRaw().toString('hex'), transfer.toRaw().toString('hex'));
  })
});
