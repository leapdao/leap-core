
/**
 * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
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
import { toHexString, arrayToRaw } from './util';
import Type from './type';

const EMPTY_BUF = Buffer.alloc(32, 0);


export default class Transaction {

  constructor(type, inputs = [], outputs = [], options) {
    this.type = type;
    this.inputs = inputs;
    this.outputs = outputs;
    this.options = options;

    // recover signer if we have signatures without signer
    if (this.inputs.length && this.inputs[0].v && !this.inputs[0].signer) {
      this.recoverTxSigner();
    }
  }

  static validatorJoin(slotId, tenderKey, eventsCount) {
    return new Transaction(
      Type.VALIDATOR_JOIN,
      [],
      [],
      {
        slotId,
        eventsCount,
        tenderKey: tenderKey.toLowerCase(),
      },
    );
  }

  static validatorLogout(slotId, tenderKey, eventsCount, activationEpoch) {
    return new Transaction(
      Type.VALIDATOR_LOGOUT,
      [],
      [],
      {
        slotId,
        eventsCount,
        tenderKey: tenderKey.toLowerCase(),
        activationEpoch,
      },
    );
  }

  static periodVote(slotId, input) {
    return new Transaction(Type.PERIOD_VOTE, [input], [], { slotId });
  }

  static deposit(depositId, value, address, color) {
    return new Transaction(
      Type.DEPOSIT, [], [new Output(value, address, color)], { depositId },
    );
  }

  static exit(input) {
    return new Transaction(Type.EXIT, [input]);
  }

  static transfer(inputs, outputs) {
    return new Transaction(Type.TRANSFER, inputs, outputs);
  }

  static consolidate(inputs, output) {
    inputs.forEach((input) => {
      input.type = Type.CONSOLIDATE; // eslint-disable-line
    });
    return new Transaction(Type.CONSOLIDATE, inputs, [output]);
  }

  static compRequest(inputs, outputs) {
    inputs[0].type = Type.COMP_REQ;  // eslint-disable-line no-param-reassign
    return new Transaction(Type.COMP_REQ, inputs, outputs);
  }

  static compResponse(inputs, outputs) {
    inputs[0].type = Type.COMP_RESP;  // eslint-disable-line no-param-reassign
    return new Transaction(Type.COMP_RESP, inputs, outputs);
  }

  /*
  * Returns raw transaction size.
  * See `toRaw` for details.
  */
  getSize() {
    if (this.type === Type.DEPOSIT) {
      return 36;
    }

    if (this.type === Type.TRANSFER) {
      return 2 + this.inputs.reduce((s, i) => s + i.getSize(), 0)
        + this.outputs.reduce((s, o) => s + o.getSize(), 0);
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
    let offset = 2;

    // copy type, height and lengths
    raw.copy(noSigs, 0, 0, offset);

    for (let i = 0; i < inputsLength; i += 1) {
      raw.copy(noSigs, offset, offset, offset + 33);
      offset += ((type !== Type.TRANSFER && type !== Type.CONSOLIDATE) && i === 0) ? 33 : 98;
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
    if (this.type === Type.PERIOD_VOTE) {
      const sig = ethUtil.ecsign(
        this.inputs[0].prevout.hash,
        // Buffer.from(this.options.merkleRoot.replace('0x', ''), 'hex'),
        Buffer.from(privKeys[0].replace('0x', ''), 'hex'),
      );
      this.inputs[0].setSig(
        sig.r, sig.s, sig.v,                               // sig
        toHexString(ethUtil.privateToAddress(privKeys[0])), // signer
      );
      return this;
    }
    if (privKeys.length !== this.inputs.length) {
      throw Error('amount of private keys doesn\'t match amount of inputs');
    }
    if (this.type === Type.CONSOLIDATE) {
      // no signatures needed
      return this;
    }
    const startIdx = (this.type === Type.TRANSFER) ? 0 : 1;
    for (let i = startIdx; i < privKeys.length; i++) {
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

  signAll(privKey) {
    return this.sign(this.inputs.map(() => privKey));
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
  *
  * Deposit (36 bytes):
  *
  * 0 -   1 byte type
  * 1 -   1 byte inputs and outputs
  * 2 -   4 bytes depositId
  * 6 -   8 bytes value
  * 14 -  2 bytes color
  * 16 - 20 bytes address
  * 36
  *
  * Transfer (262 bytes):
  *
  * 0 -   1 byte type
  * 1 -   4 bits number of inputs
  * 1 -   4 bits number of outputs
  * 2 -   32 bytes prev tx          $
  * 34 -  1 byte output pos         $      first input
  * 35 -  32 bytes r-signature        #
  * 67 -  32 bytes s-signature        #    first signature
  * 99 -  1 byte v-signature          #
  * 108 - 32 bytes prev tx          $
  * 140 - 1 byte output pos         $      second input
  * 141 - 32 bytes r-signature        #
  * 173 - 32 bytes s-signature        #    second signature
  * 205 - 1 byte v-signature          #
  * 206 - 8 bytes value             $
  * 214 - 2 bytes color
  * 216 - 20 bytes address          $      first output
  * 236 - 8 bytes value               #
  * 244 - 2 bytes color
  * 246 - 20 bytes address            #    second output
  * 266
  *
  * Consolidate (167 bytes):
  *
  * 0   -  1 byte type
  * 1   -  1 byte number of inputs
  * 2   - 32 bytes prev tx          #
  * 34  -  1 byte output pos        # first input
  * 35  - 32 bytes r-signature      #
  * 67  - 32 bytes s-signature      # first signature
  * 99  -  1 byte v-signature       #
  * 100 - 32 bytes prev tx          #
  * 132 -  1 byte output pos        # second input
  * 133 - 32 bytes r-signature      #
  * 165 - 32 bytes s-signature      # second signature
  * 166 -  1 byte v-signature       #
  * 167
  *
  * */
  toRaw() {
    let payload;
    let inputs = [];
    if (this.type === Type.DEPOSIT) {
      payload = Buffer.alloc(6, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt8(16 + 1, 1);  // 1 inputs, 1 output
      payload.writeUInt32BE(this.options.depositId, 2);
    } else if (this.type === Type.VALIDATOR_JOIN) {
      payload = Buffer.alloc(40, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt8(0, 1); // 0 inputs, 0 output
      payload.writeUInt16BE(this.options.slotId, 2);
      payload.write(this.options.tenderKey.replace('0x', ''), 4, 'hex');
      payload.writeUInt32BE(this.options.eventsCount, 36);
    } else if (this.type === Type.VALIDATOR_LOGOUT) {
      payload = Buffer.alloc(44, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt8(0, 1); // 0 inputs, 0 output
      payload.writeUInt16BE(this.options.slotId, 2);
      payload.write(this.options.tenderKey.replace('0x', ''), 4, 'hex');
      payload.writeUInt32BE(this.options.eventsCount, 36);
      payload.writeUInt32BE(this.options.activationEpoch, 40);
    } else if (this.type === Type.PERIOD_VOTE) {
      payload = Buffer.alloc(3, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt8(16, 1); // 1 input, 0 output
      payload.writeUInt8(this.options.slotId, 2);
      inputs = this.inputs;
    } else if (this.type === Type.EXIT) {
      payload = Buffer.alloc(34, 0);
      payload.writeUInt8(this.type, 0);
      arrayToRaw(this.inputs).copy(payload, 1, 0, 33);
    } else if (this.type === Type.TRANSFER) {
      payload = Buffer.alloc(2, 0);
      payload.writeUInt8(this.type, 0);
      // write ins and outs length as nibbles
      payload.writeUInt8((16 * this.inputs.length) + this.outputs.length, 1);
      inputs = this.inputs;
    } else if (this.type === Type.CONSOLIDATE) {
      payload = Buffer.alloc(2, 0);
      payload.writeUInt8(this.type, 0);
      // always one output, no need to read second nibble
      payload.writeUInt8((16 * this.inputs.length) + 1, 1);
      inputs = this.inputs;
    } else if (this.type === Type.COMP_REQ || this.type === Type.COMP_RESP) {
      payload = Buffer.alloc(2, 0);
      payload.writeUInt8(this.type, 0);
      this.inputs[0].type = this.type;
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
      case Type.DEPOSIT: {
        if (dataBuf.length !== 36) {
          throw new Error('malformed deposit tx.');
        }
        const depositId = dataBuf.readUInt32BE(2);
        const output = Output.fromRaw(dataBuf.slice(6));
        return new Transaction(Type.DEPOSIT, [], [output], { depositId });
      }
      case Type.VALIDATOR_JOIN: {
        const txFunction = type === Type.VALIDATOR_JOIN ? 'validatorJoin' : 'validatorLeave';
        if (dataBuf.length !== 40) {
          throw new Error(`malformed ${txFunction} tx.`);
        }
        const slotId = dataBuf.readUInt16BE(2);
        const tenderKey = `0x${dataBuf.slice(4, 36).toString('hex')}`;
        const eventsCount = dataBuf.readUInt32BE(36);
        return Transaction[txFunction](slotId, tenderKey, eventsCount);
      }
      case Type.VALIDATOR_LOGOUT: {
        if (dataBuf.length !== 44) {
          throw new Error('malformed validatorLogout tx.');
        }
        const slotId = dataBuf.readUInt16BE(2);
        const tenderKey = `0x${dataBuf.slice(4, 36).toString('hex')}`;
        const eventsCount = dataBuf.readUInt32BE(36);
        const activationEpoch = dataBuf.readUInt32BE(40);
        return Transaction.validatorLogout(slotId, tenderKey, eventsCount, activationEpoch);
      }
      case Type.PERIOD_VOTE: {
        if (dataBuf.length !== 101) {
          throw new Error('malformed periodVote tx.');
        }
        const slotId = dataBuf.readUInt8(2);
        // const merkleRoot =
        // const v = dataBuf.readUInt8(35);
        // const r = `0x${dataBuf.slice(36, 68).toString('hex')}`;
        // const s = `0x${dataBuf.slice(68, 100).toString('hex')}`;
        // return Transaction.periodVote(merkleRoot, slotId, v, r, s);

        const ins = [];
        const sigHashBuf = dataBuf.slice(3, 35);
        ins.push(Input.fromRaw(dataBuf, 3, sigHashBuf));
        return new Transaction(Type.PERIOD_VOTE, ins, [], { slotId });
  // * 0 -   1 byte type
  // * 1 -   4 bits number of inputs
  // * 1 -   4 bits number of outputs
  // * 2 -   32 bytes prev tx          $
  // * 34 -  1 byte output pos         $      first input
  // * 35 -  32 bytes r-signature        #
  // * 67 -  32 bytes s-signature        #    first signature
  // * 99 -  1 byte v-signature          #
      }
      case Type.EXIT: {
        if (dataBuf.length !== 34) {
          throw new Error('malformed exit tx.');
        }
        const outpoint = Outpoint.fromRaw(dataBuf, 1);
        return new Transaction(Type.EXIT, [new Input(outpoint)], []);
      }
      case Type.TRANSFER: {
        const insOuts = dataBuf.readUInt8(1);
        const insLength = insOuts >> 4; // eslint-disable-line no-bitwise
        const outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
        const ins = [];
        const sigHashBuf = Transaction.sigHashBufStatic(type, dataBuf, insLength);
        for (let i = 0; i < insLength; i += 1) {
          ins.push(Input.fromRaw(dataBuf, 2 + (i * SPEND_INPUT_LENGTH), sigHashBuf));
        }
        const outs = [];
        for (let i = 0; i < outsLength; i += 1) {
          outs.push(Output.fromRaw(
            dataBuf,
            2 + (insLength * SPEND_INPUT_LENGTH) + (i * OUT_LENGTH),
          ));
        }
        return new Transaction(Type.TRANSFER, ins, outs);
      }
      case Type.CONSOLIDATE: {
        const insOuts = dataBuf.readUInt8(1);
        const insLength = insOuts >> 4; // eslint-disable-line no-bitwise
        const ins = [];
        const unsignedInputLength = 33;
        for (let i = 0; i < insLength; i += 1) {
          ins.push(Input.fromRaw(dataBuf, 2 + (i * unsignedInputLength), Type.CONSOLIDATE));
        }
        const outs = [];
        outs.push(Output.fromRaw(dataBuf, 2 + (insLength * unsignedInputLength)));
        return new Transaction(Type.CONSOLIDATE, ins, outs);
      }
      case Type.COMP_REQ: {
        const insOuts = dataBuf.readUInt8(1);
        const insLength = insOuts >> 4; // eslint-disable-line no-bitwise
        const outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
        const ins = [];
        ins.push(Input.fromRaw(dataBuf, 2, Type.COMP_REQ));
        const sigHashBuf = Transaction.sigHashBufStatic(type, dataBuf, insLength);
        // computation input size:
        // tx-type 1b, input# output# 1b, outpoint 33b
        let offset = 35;
        for (let i = 1; i < insLength; i += 1) {
          ins.push(Input.fromRaw(dataBuf, offset, sigHashBuf));
          offset += SPEND_INPUT_LENGTH;
        }
        const outs = [];
        outs.push(Output.fromRaw(dataBuf, offset, 1));
        // computation output size:
        // value 8 + color 2 + address 20 + gasPrice 4 + length 2 + length
        offset += 36 + outs[0].msgData.length;
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
        ins.push(Input.fromRaw(dataBuf, 2, Type.COMP_RESP));
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
