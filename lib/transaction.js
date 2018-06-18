
/**
 * Copyright (c) 2013-present, Parsec Labs (parseclabs.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source 
 * tree.
 */

import ethUtil from 'ethereumjs-util';
import { deepEqual } from 'fast-equals';

import Input, { SPEND_INPUT_LENGTH } from './input';
import Output, { OUT_LENGTH } from './output';
import Outpoint from './outpoint';
import { toHexString, arrayToRaw, writeUint64, readUint64 } from './util';

const EMPTY_BUF = Buffer.alloc(32, 0);

export const Type = {
  COINBASE: 1,
  DEPOSIT: 2,
  TRANSFER: 3,
  ACCOUNT_SIM: 4,
  COMP_REQ: 5,
  COMP_RESP: 6,
  EXIT: 7,
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

  static exit(input) {
    return new Transaction(Type.EXIT, [input], []);
  }

  static transfer(height, inputs, outputs) {
    return new Transaction(Type.TRANSFER, inputs, outputs, { height });
  }

  static compRequest(inputs, outputs) {
    return new Transaction(Type.COMP_REQ, inputs, outputs);
  }

  static compResponse(inputs, outputs) {
    return new Transaction(Type.COMP_RESP, inputs, outputs);
  }

  /*
  * Returns raw transaction size.
  * See `toRaw` for details.
  */
  getSize() {
    if (this.type === Type.COINBASE) {
      return 29;
    }
    if (this.type === Type.DEPOSIT) {
      return 33;
    }
    if (this.type === Type.TRANSFER) {
      let size = 10
        + this.inputs.reduce((s, i) => s += i.getSize())
        + this.outputs.reduce((s, o) => s += o.getSize());
    }

    return this.toRaw().length;
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
  static sigHashBufStatic(type, raw, inputsLength) {
    const noSigs = Buffer.alloc(raw.length, 0);
    let offset = (type === Type.TRANSFER) ? 10 : 2;

    // copy type, height and lengths
    raw.copy(noSigs, 0, 0, offset);

    for (let i = 0; i < inputsLength; i += 1) {
      raw.copy(noSigs, offset, offset, offset + 33);
      offset += (type !== Type.TRANSFER && i === 0) ? 33 : 98;
    }
    raw.copy(noSigs, offset, offset, raw.length);
    return ethUtil.sha3(noSigs);
  }

  sigHashBuf() {
    return Transaction.sigHashBufStatic(this.type, this.toRaw(), this.inputs.length);
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
    for (let i = (this.type === Type.TRANSFER) ? 0 : 1; i < privKeys.length; i++) {
      const sig = ethUtil.ecsign(
        this.sigHashBuf(),
        Buffer.from(privKeys[i].replace('0x', ''), 'hex'),
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
    if (this.type === Type.TRANSFER && raw.slice(34, 66).equals(EMPTY_BUF)) {
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
    let inputs = [];
    if (this.type === Type.DEPOSIT) {
      payload = Buffer.alloc(5, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt32BE(this.options.depositId, 1);
    } else if (this.type === Type.EXIT) {
      payload = Buffer.alloc(34, 0);
      payload.writeUInt8(this.type, 0);
      arrayToRaw(this.inputs).copy(payload, 1, 0, 33);
    } else if (this.type === Type.TRANSFER) {
      payload = Buffer.alloc(10, 0);
      payload.writeUInt8(this.type, 0);
      writeUint64(payload, this.options.height, 1);
      // write ins and outs length as nibbles
      payload.writeUInt8((16 * this.inputs.length) + this.outputs.length, 9);
      inputs = this.inputs;
    } else if (this.type === Type.COMP_REQ || this.type === Type.COMP_RESP) {
      payload = Buffer.alloc(2, 0);
      payload.writeUInt8(this.type, 0);
      this.inputs[0].contractAddr = '0x00';
      // write ins and outs length as nibbles
      payload.writeUInt8((16 * this.inputs.length) + this.outputs.length, 1);
      inputs = this.inputs;
    } else {
      payload = Buffer.alloc(1, 0);
      payload.writeUInt8(this.type, 0);
      inputs = this.inputs;
    }
    return Buffer.concat([payload, arrayToRaw(inputs), arrayToRaw(this.outputs)]);
  }

  toJSON() {
    const json = {
      type: this.type,
      hash: this.hash(),
      inputs: this.inputs.map(inp => inp.toJSON()),
      outputs: this.outputs.map(out => out.toJSON()),
    };

    if (this.options) {
      json.options = this.options;
    }

    return json;
  }

  static fromJSON({ type, inputs, outputs, options }) {
    return new Transaction(
      type,
      inputs.map(Input.fromJSON),
      outputs.map(Output.fromJSON),
      options,
    );
  }

  static parseToParams(transaction) {
    const bufs = this.parseToBuf(transaction);
    return bufs.parts.map(buf => `0x${buf.toString('hex')}`);
  }

  // Constructs Transaction from given raw bytes
  // @returns {Transaction}
  static fromRaw(transaction) {
    let dataBuf = transaction;
    if (!Buffer.isBuffer(transaction)) {
      const dataHex = transaction.replace('0x', '');
      dataBuf = Buffer.alloc(dataHex.length / 2);
      dataBuf.write(dataHex, 'hex');
    }

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
      case Type.EXIT: {
        if (dataBuf.length !== 34) {
          throw new Error('malformed exit tx.');
        }
        const outpoint = Outpoint.fromRaw(dataBuf, 1);
        return new Transaction(Type.EXIT, [new Input(outpoint)], []);
      }
      case Type.TRANSFER: {
        const height = readUint64(dataBuf, 1);
        const insOuts = dataBuf.readUInt8(9);
        const insLength = insOuts >> 4; // eslint-disable-line no-bitwise
        const outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
        const ins = [];
        const sigHashBuf = Transaction.sigHashBufStatic(type, dataBuf, insLength);
        for (let i = 0; i < insLength; i += 1) {
          ins.push(Input.fromRaw(dataBuf, 10 + (i * SPEND_INPUT_LENGTH), sigHashBuf));
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
      case Type.COMP_REQ: {
        const insOuts = dataBuf.readUInt8(1);
        const insLength = insOuts >> 4; // eslint-disable-line no-bitwise
        const outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
        const ins = [];
        ins.push(Input.fromRaw(dataBuf, 2));
        const sigHashBuf = Transaction.sigHashBufStatic(type, dataBuf, insLength);
        let offset = 35;
        for (let i = 1; i < insLength; i += 1) {
          ins.push(Input.fromRaw(dataBuf, offset, sigHashBuf));
          offset += SPEND_INPUT_LENGTH;
        }
        const outs = [];
        outs.push(Output.fromRaw(dataBuf, offset, 1));
        // value 8 + gasPrice 4 + length 2 + length
        offset += 14 + outs[0].msgData.length;
        for (let i = 1; i < outsLength; i += 1) {
          outs.push(Output.fromRaw(dataBuf, offset));
          offset += OUT_LENGTH;
        }
        return new Transaction(Type.COMP_REQ, ins, outs);
      }
      case Type.COMP_RESP: {
        const insOuts = dataBuf.readUInt8(1);
        const outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
        const ins = [];
        ins.push(Input.fromRaw(dataBuf, 2));
        const outs = [];
        outs.push(Output.fromRaw(dataBuf, 35, 2));
        for (let i = 1; i < outsLength; i += 1) {
          outs.push(Output.fromRaw(dataBuf, 95 + ((i - 1) * OUT_LENGTH)));
        }
        return new Transaction(Type.COMP_RESP, ins, outs);
      }
      default: {
        throw new Error(`unknown transaction type: ${type}.`);
      }
    }
  }

}
