import ethUtil from 'ethereumjs-util';
import { deepEqual } from 'fast-equals';

import Input, { SPEND_INPUT_LENGTH } from './input';
import Output, { OUT_LENGTH } from './output';
import { toHexString, arrayToRaw, writeUint64 } from './util';

const EMPTY_BUF = Buffer.alloc(32, 0);

export const Type = {
  COINBASE: 1,
  DEPOSIT: 2,
  TRANSFER: 3,
  ACCOUNT_SIM: 4,
  COMP_REQ: 5,
  COMP_RESP: 6,
};


export default class Transaction {

  constructor(type, inputs, outputs, options) {
    this.type = type;
    this.inputs = inputs || [];
    this.outputs = outputs || [];
    this.options = options;

    // recover signer if we have signatures without signer
    if (this.inputs.length && this.inputs[0].v && !this.inputs[0].signer) {
      this.recoverTxSigner();
    }
  }

  static coinbase(value, address) {
    return new Transaction(Type.COINBASE, [], [new Output(value, address)]);
  }

  static deposit(depositId, value, address) {
    return new Transaction(
      Type.DEPOSIT, [], [new Output(value, address)], { depositId },
    );
  }

  static transfer(height, inputs, outputs) {
    return new Transaction(Type.TRANSFER, inputs, outputs, { height });
  }

  // Recovers signer address for each of the inputs
  // Requires inputs to be signed.
  recoverTxSigner() {
    this.inputs.map(i => i.recoverSigner(this.sigHashBuf()));
  }

  // Returns sigHash as Buffer.
  // Calculated as follows:
  // 1. serialize to bytes
  // 2. strip out input signatures
  // 3. calc sha3
  sigHashBuf() {
    const raw = this.toRaw();
    const noSigs = Buffer.alloc(raw.length, 0);
    // copy type, height and lengths
    raw.copy(noSigs, 0, 0, 10);

    let start;
    for (let i = 0; i < this.inputs.length; i += 1) {
      start = 10 + (i * 98);
      raw.copy(noSigs, start, start, start + 33);
    }
    start = 10 + (this.inputs.length * 98);
    raw.copy(noSigs, start, start, raw.length);
    return ethUtil.sha3(noSigs);
  }

  // Returns sigHash as hex string
  sigHash() {
    return `0x${this.sigHashBuf().toString('hex')}`;
  }

  // Signs each input with provided private keys
  // @param {Array} privKeys - array of private keys strings.
  sign(privKeys) {
    if (privKeys.length !== this.inputs.length) {
      throw Error('amount of private keys doesn\'t match amount of inputs');
    }
    for (let i = 0; i < privKeys.length; i++) {
      const sig = ethUtil.ecsign(
        this.sigHashBuf(),
        new Buffer(privKeys[i].replace('0x', ''), 'hex'),
      );
      this.inputs[i].setSig(
        sig.r, sig.s, sig.v,                               // sig
        toHexString(ethUtil.privateToAddress(privKeys[i])), // signer
      );
    }
    return this;
  }

  // Returns tx hash as Buffer
  hashBuf() {
    const raw = this.toRaw();
    if (raw.slice(34, 66).equals(EMPTY_BUF)) {
      throw Error('not signed yet');
    }
    return ethUtil.sha3(raw);
  }

  // Returns tx hash as hex string
  hash() {
    return toHexString(this.hashBuf());
  }

  // Returns serialized tx bytes as hex string
  hex() {
    return toHexString(this.toRaw());
  }

  // Checks if this tx is equal to `another`
  equals(another) {
    return deepEqual(this, another);
  }

  /**
  *
  * Serialized this tx in bytes as follows:
  *
  * Coinbase (29 bytes):
  *
  * 0 -   1 byte type
  * 1 -   8 bytes value
  * 9 -  20 bytes address
  * 29
  *
  * Deposit (33 bytes):
  *
  * 0 -   1 byte type
  * 1 -   4 bytes depositId
  * 5 -   8 bytes value
  * 13 -  20 bytes address
  * 33
  *
  * Transfer (262 bytes):
  *
  * 0 -   1 byte type
  * 1 -   8 bytes height
  * 9 -   4 bits number of inputs
  * 9 -   4 bits number of outputs
  * 10 -  32 bytes prev tx          $
  * 42 -  1 byte output pos         $      first input
  * 43 -  32 bytes r-signature        #
  * 75 -  32 bytes s-signature        #    first signature
  * 107 - 1 byte v-signature          #
  * 108 - 32 bytes prev tx          $
  * 140 - 1 byte output pos         $      second input
  * 141 - 32 bytes r-signature        #
  * 173 - 32 bytes s-signature        #    second signature
  * 205 - 1 byte v-signature          #
  * 206 - 8 bytes value             $
  * 214 - 20 bytes address          $      first output
  * 234 - 8 bytes value               #
  * 242 - 20 bytes address            #    second output
  * 262
  *
  * */
  toRaw() {
    let payload;
    if (this.type === Type.DEPOSIT) {
      payload = Buffer.alloc(5, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt32BE(this.options.depositId, 1);
    } else if (this.type === Type.TRANSFER) {
      payload = Buffer.alloc(10, 0);
      payload.writeUInt8(this.type, 0);
      writeUint64(payload, this.options.height, 1);
      // write ins and outs length as nibbles
      payload.writeUInt8((16 * this.inputs.length) + this.outputs.length, 9);
    } else {
      payload = Buffer.alloc(1, 0);
      payload.writeUInt8(this.type, 0);
    }

    return Buffer.concat([payload, arrayToRaw(this.inputs), arrayToRaw(this.outputs)]);
  }

  static parseToParams(transaction) {
    const bufs = this.parseToBuf(transaction);
    return bufs.parts.map(buf => `0x${buf.toString('hex')}`);
  }

  // Constructs Transaction from given raw bytes
  // @returns {Transaction}
  static fromRaw(transaction) {
    const dataHex = transaction.replace('0x', '');
    const dataBuf = Buffer.alloc(dataHex.length / 2);
    dataBuf.write(dataHex, 'hex');

    const type = dataBuf.readUInt8(0);

    switch (type) {
      case Type.COINBASE: {
        if (dataBuf.length !== 29) {
          throw new Error('malformed coinbase tx.');
        }
        const output = Output.fromRaw(dataBuf.slice(1));
        return new Transaction(Type.COINBASE, [], [output]);
      }
      case Type.DEPOSIT: {
        if (dataBuf.length !== 33) {
          throw new Error('malformed deposit tx.');
        }
        const depositId = dataBuf.readUInt32BE(1);
        const output = Output.fromRaw(dataBuf.slice(5));
        return new Transaction(Type.DEPOSIT, [], [output], { depositId });
      }
      case Type.TRANSFER: {
        const height = parseInt(dataBuf.slice(1, 9).toString('hex'), 16);
        const insOuts = dataBuf.readUInt8(9);
        const insLength = insOuts >> 4; // eslint-disable-line no-bitwise
        const outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
        const ins = [];
        for (let i = 0; i < insLength; i += 1) {
          ins.push(Input.fromRaw(dataBuf, 10 + (i * SPEND_INPUT_LENGTH)));
        }
        const outs = [];
        for (let i = 0; i < outsLength; i += 1) {
          outs.push(Output.fromRaw(
            dataBuf,
            10 + (insLength * SPEND_INPUT_LENGTH) + (i * OUT_LENGTH),
          ));
        }
        return new Transaction(Type.TRANSFER, ins, outs, { height });
      }
      default: {
        throw new Error(`unknown transaction type: ${type}.`);
      }
    }
  }

}
