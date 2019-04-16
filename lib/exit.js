import util from 'ethereumjs-util';
import { bi } from 'jsbi-utils';
import fetch from 'node-fetch';

import Tx from './transaction';
import Outpoint from './outpoint';
import Output from './output';
import Input from './input';
import { periodBlockRange } from './helpers';


export default class Exit {
  /**
   * Returns:
   * 0 -  32 bytes utxoId
   * 32 -  32 bytes amount of money
   * 64 -  32 bytes r-signature
   * 96 -  32 bytes s-signature
   * 128 - 31 bytes padding
   * 159 -  1 byte v-signature
   */
  static signOverExit(utxoId, amount, privKey) {
    const sigHashBuff = Exit.sigHashBuff(utxoId, amount);
    const sigHash = util.hashPersonalMessage(sigHashBuff);
    const sig = util.ecsign(
      sigHash,
      Buffer.from(privKey.replace('0x', ''), 'hex'),
    );
    const vBuff = Buffer.alloc(32);
    vBuff.writeInt8(sig.v, 31);
    return Buffer.concat([sigHashBuff, sig.r, sig.s, vBuff]);
  }

  /**
   * params:
   * utxoId: string with 0x, e.g. 0x0000000000000000000000000000000000b447b980aea5accb5fd68789f6b099
   * amount: BigInt | number
   * returns:
   * 64 byte buffer
   */
  static sigHashBuff(utxoId, amount) {
    const valueBuf = util.setLengthLeft(
      Buffer.from(util.padToEven(amount.toString(16)), 'hex'),
      32,
    );
    const utxoIdBuf = Buffer.from(utxoId.replace('0x', ''), 'hex');

    return Buffer.concat([utxoIdBuf, valueBuf]);
  }

  static bufferToBytes32Array(buffer) {
    const output = [];
    let offset = 0;
    for (let i = 0; i < buffer.length / 32; i++) {
      const bytes32 = `0x${buffer.slice(offset, offset + 32).toString('hex')}`;
      offset += 32;
      output.push(bytes32);
    }
    return output;
  }

  static txFromProof(proof) {
    const tx = Tx.fromRaw(this.parseTxDataFromProof(proof));
    return tx;
  }

  static parseTxDataFromProof(proof) {
    const wordLength = 32;
    const buf = Buffer.alloc(proof.length * wordLength);
    for (let i = 0; i < proof.length; i++) {
      Buffer.from(proof[i].replace('0x', ''), 'hex').copy(buf, i * wordLength, 0, wordLength);
    }
    const offset = buf.readUInt8(32);
    const length = buf.readUInt16BE(34);

    const txData = Buffer.alloc(length);
    buf.copy(txData, 0, offset, offset + length);
    return txData;
  }

  static async fastSellUTXO(utxo, plasmaChain, rootChain, marketMakerUrl) {
    const nodeConfig = await plasmaChain.getConfig();
    const inputs = [new Input(utxo.outpoint)];
    const outputs = [
      new Output(utxo.output.value, nodeConfig.exitHandlerAddr, utxo.output.color)
    ];
    const exitingUtxoTransfer = Tx.transfer(inputs, outputs);
    return Exit.fastSell(exitingUtxoTransfer, plasmaChain, rootChain, marketMakerUrl);
  }

  static async fastSellAmount(account, amount, color, plasmaChain, rootChain, marketMakerUrl) {
    const unspent = await plasmaChain.getUnspent(account);
    const nodeConfig = await plasmaChain.getConfig();

    const exitingUtxoTransfer = Tx.transferFromUtxos(
      unspent, account, nodeConfig.exitHandlerAddr, amount, color,
    );
    return Exit.fastSell(exitingUtxoTransfer, plasmaChain, rootChain, marketMakerUrl);
  }

  static async fastSell(spendTx, plasmaChain, rootChain, marketMakerUrl) {
    const amount = bi(spendTx.outputs[0].value);

    const signedTx = await spendTx.signWeb3(rootChain);
    const transferTx = await plasmaChain.eth.sendSignedTransaction(
      signedTx.hex()
    );

    const tx = Tx.fromRaw(transferTx.raw);      
    const utxoId = (new Outpoint(tx.hash(), 0)).getUtxoId();
    const sigHashBuff = Exit.sigHashBuff(utxoId, amount);
    const sigHash = `0x${sigHashBuff.toString('hex')}`;
    const inputTx = await plasmaChain.eth.getTransaction(
      util.bufferToHex(tx.inputs[0].prevout.hash)
    );

    const sig = await Tx.signMessageWithWeb3(rootChain, sigHash);

    const vBuff = Buffer.alloc(32);
    vBuff.writeInt8(sig.v, 31);    
    const signedData = Exit.bufferToBytes32Array(
      Buffer.concat([sigHashBuff, Buffer.from(sig.r), Buffer.from(sig.s), vBuff])
    );
    const setup = {
      inputTx,
      tx: transferTx,
      effectiveBlock: periodBlockRange(transferTx.blockNumber)[1],
      signedData
    };

    return fetch(
      marketMakerUrl,
      {
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(setup),
      }
    ).then(response => response.json());
  }
}
