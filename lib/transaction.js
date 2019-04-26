/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import ethUtil from 'ethereumjs-util';
import { BigInt } from 'jsbi-utils';

import { calcInputs, calcOutputs } from './helpers';
import Input, { SPEND_INPUT_LENGTH } from './input';
import Output, { OUT_LENGTH, NST_OUT_LENGTH } from './output';
import Outpoint from './outpoint';
import { arrayToRaw, toHexString, ensureSafeValue } from './util';
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

  static epochLength(epochLength) {
    return new Transaction(Type.EPOCH_LENGTH, [], [], { epochLength });
  }


  static minGasPrice(minGasPrice) {
    ensureSafeValue(minGasPrice);
    return new Transaction(Type.MIN_GAS_PRICE, [], [], { minGasPrice: BigInt(minGasPrice) });
  }

  static validatorJoin(slotId, tenderKey, eventsCount, signerAddr) {
    return new Transaction(
      Type.VALIDATOR_JOIN,
      [],
      [],
      {
        slotId,
        eventsCount,
        signerAddr: signerAddr.toLowerCase(),
        tenderKey: tenderKey.toLowerCase(),
      },
    );
  }

  static validatorLogout(slotId, tenderKey, eventsCount, activationEpoch, newSigner) {
    return new Transaction(
      Type.VALIDATOR_LOGOUT,
      [],
      [],
      {
        slotId,
        eventsCount,
        tenderKey: tenderKey.toLowerCase(),
        activationEpoch,
        newSigner: newSigner.toLowerCase(),
      },
    );
  }

  static periodVote(slotId, input) {
    return new Transaction(Type.PERIOD_VOTE, [input], [], { slotId });
  }

  static deposit(depositId, value, address, color, data) {
    return new Transaction(
      Type.DEPOSIT, [], [new Output(value, address, color, data)], { depositId },
    );
  }

  static exit(input) {
    return new Transaction(Type.EXIT, [input]);
  }

  static transfer(inputs, outputs) {
    return new Transaction(Type.TRANSFER, inputs, outputs);
  }

  static transferFromUtxos(utxos, from, to, value, color) {
    const inputs = calcInputs(
      utxos,
      from,
      value,
      color
    );

    const outputs = calcOutputs(
      utxos,
      inputs,
      from,
      to,
      value,
      color
    );

    return this.transfer(inputs, outputs);
  }

  static spendCond(inputs, outputs) {
    inputs[0].type = Type.SPEND_COND;  // eslint-disable-line no-param-reassign
    return new Transaction(Type.SPEND_COND, inputs, outputs);
  }

  /*
  * Returns raw transaction size.
  * See `toRaw` for details.
  */
  getSize() {
    if (this.type === Type.DEPOSIT) {
      const output = this.outputs[0];

      return output.getSize() + 6;
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
    this.inputs.map(i => i.recoverSigner(this.sigDataBuf()));
  }

  // Returns sigData as Buffer.
  // Calculated as follows:
  // 1. serialize to bytes
  // 2. strip out input signatures
  static sigDataBufStatic(type, raw, inputsLength) {

    let noSigs = Buffer.alloc(raw.length, 0);
    if (type === Type.TRANSFER) {
      
      let offset = 2;

      // copy type and lengths
      raw.copy(noSigs, 0, 0, offset);

      for (let i = 0; i < inputsLength; i += 1) {
        raw.copy(noSigs, offset, offset, offset + 33);
        offset += (type !== Type.TRANSFER && i === 0) ? 33 : 98;
      }
      raw.copy(noSigs, offset, offset, raw.length);
    } else if (type === Type.SPEND_COND) {
      // spend_cond sighash is calculated with 00 for msgData
      // as message data will contain the signature for spending the tx

      const bytesStripped = raw.readUInt16BE(35); // offset of msgData length in 1st input

      noSigs = Buffer.alloc(raw.length - bytesStripped, 0);
      let readOffset = 0;
      let writeOffset = 0;
      // copy type and lengths
      raw.copy(noSigs, writeOffset, readOffset, 2);
      readOffset += 2;
      writeOffset += 2;

      for (let i = 0; i < inputsLength; i += 1) {
        raw.copy(noSigs, writeOffset, readOffset, readOffset + 33);
        if (i === 0) {
          const msgLength = raw.readUInt16BE(readOffset + 33);
          readOffset += 33 + 2 + msgLength;
          writeOffset += 33 + 2;
          const scriptLength = raw.readUInt16BE(readOffset);
          raw.copy(noSigs, writeOffset, readOffset, readOffset + 2 + scriptLength);
          readOffset += 2 + scriptLength;
          writeOffset += 2 + scriptLength;
        } else {
          // all but first inputs have 65 bytes for sig
          readOffset += 33 + 65;
          writeOffset += 33 + 65;
        }
      }
      raw.copy(noSigs, writeOffset, readOffset, raw.length);
    }
    return noSigs;
  }

  sigDataBuf() {
    return Transaction.sigDataBufStatic(this.type, this.toRaw(), this.inputs.length);
  }

  // Returns sigData as hex string
  sigData() {
    return ethUtil.bufferToHex(this.sigDataBuf());
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
        ethUtil.bufferToHex(ethUtil.privateToAddress(privKeys[0])), // signer
      );
      return this;
    }
    if (privKeys.length !== this.inputs.length) {
      throw Error('amount of private keys doesn\'t match amount of inputs');
    }
    const startIdx = this.type === Type.TRANSFER ? 0 : 1;
    for (let i = startIdx; i < privKeys.length; i++) {
      const sigHashBuf = ethUtil.hashPersonalMessage(this.sigDataBuf());
      const sig = ethUtil.ecsign(
        sigHashBuf,
        Buffer.from(privKeys[i].replace('0x', ''), 'hex'),
      );
      this.inputs[i].setSig(
        sig.r, sig.s, sig.v,                               // sig
        ethUtil.bufferToHex(ethUtil.privateToAddress(privKeys[i])), // signer
      );
    }
    return this;
  }

  signAll(privKey) {
    return this.sign(this.inputs.map(() => privKey));
  }

  signSpendingCondition(privKey) {
    if (this.type !== Type.SPEND_COND) {
      throw Error(`invalid Tx type: ${this.type}`);
    }

    const sigHash = Buffer.alloc(32, 0);
    this.sigHashBuf().copy(sigHash, 12, 0, 20);
    return ethUtil.ecsign(
      sigHash,
      Buffer.from(privKey.replace('0x', ''), 'hex'),
    );
  }

  sigHash() {
    return ethUtil.bufferToHex(this.sigHashBuf());
  }

  sigHashBuf() {
    const sigDataBuf = this.sigDataBuf();
    if (this.type === Type.SPEND_COND) {
      return ethUtil.ripemd160(ethUtil.keccak256(sigDataBuf));
    }

    return ethUtil.keccak256(sigDataBuf);
  }

  static signMessageWithWeb3(web3, message, accountIndex = 0) {
    const version = typeof web3.version === 'string' ? web3.version : web3.version.api;
    return new Promise((resolve, reject) => {
      web3.eth.getAccounts((err, accounts) => {
        if (err) {
          return reject(`getAccounts err: ${err}`);
        }

        if (!accounts[accountIndex]) {
          return reject(new Error(`No account at index ${accountIndex}`));
        }

        const args = version.startsWith('0') ? [accounts[accountIndex], message] : [message, accounts[accountIndex]];
        args.push((sigErr, sig) => {
          if (sigErr) {
            return reject(sigErr);
          }

          const { r, s, v } = ethUtil.fromRpcSig(sig);
          return resolve({ r, s, v, signer: accounts[accountIndex] });
        });

        // const { sign } = web3.currentProvider.isMetaMask ? web3.eth.personal : web3.eth;
        const { sign } = web3.eth.personal;
        return sign(...args);
      });
    });
  }

  signWeb3(web3, accountIndex = 0) {
    if (this.type === Type.PERIOD_VOTE) {
      return Transaction.signMessageWithWeb3(web3, this.inputs[0].prevout.hash, accountIndex)
        .then(({ r, s, v, signer }) => {
          this.inputs[0].setSig(r, s, v, signer);
          return this;
        });
    }

    return Transaction.signMessageWithWeb3(web3, this.sigData(), accountIndex)
      .then(({ r, s, v, signer }) => {
        const inputs = this.type === Type.TRANSFER
          ? this.inputs
          : this.inputs.slice(1);
        inputs.forEach((input) => {
          input.setSig(r, s, v, signer);
        });

        return this;
      });
  }

  // Returns tx hash as Buffer
  hashBuf() {
    const raw = this.toRaw();
    if (!this.isSigned()) {
      throw Error('not signed yet');
    }
    return ethUtil.keccak256(raw);
  }

  isSigned() {
    return this.type !== Type.TRANSFER || !this.toRaw().slice(35, 67).equals(EMPTY_BUF);
  }

  // Returns tx hash as hex string
  hash() {
    return ethUtil.bufferToHex(this.hashBuf());
  }

  // Returns serialized tx bytes as hex string
  hex() {
    return ethUtil.bufferToHex(this.toRaw());
  }

  // Checks if this tx is equal to `another`
  equals(another) {
    return this.toRaw().equals(another.toRaw());
  }

  /**
  *
  * Serialized this tx in bytes as follows:
  *
  *
  * Deposit (60 bytes):
  *
  * 0 -   1 byte type
  * 1 -   4 bits number of inputs (always 1)
  * 1 -   4 bits number of outputs (always 1)
  * 2 -   4 bytes depositId
  * 6 -  32 bytes value
  * 38 -  2 bytes color
  * 40 - 20 bytes address
  * 60
  *
  * Transfer (314 bytes):
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
  * 206 - 32 bytes value            $
  * 238 - 2 bytes color             $
  * 240 - 20 bytes address          $      first output
  * 260 - 32 bytes value              #
  * 292 - 2 bytes color               #
  * 294 - 20 bytes address            #    second output
  * 314
  *
  * */
  toRaw() {
    let payload;
    let inputs = [];
    const writeLengths = (inputsLength, outputsLength) => {
      // write ins and outs length as nibbles
      if (inputsLength > 15) {
        throw new Error('Too many inputs (>15)');
      }
      payload.writeUInt8((16 * inputsLength) + outputsLength, 1);
    }
    if (this.type === Type.DEPOSIT) {
      payload = Buffer.alloc(6, 0);
      payload.writeUInt8(this.type, 0);
      writeLengths(1, 1);
      payload.writeUInt32BE(this.options.depositId, 2);
    } else if (this.type === Type.EPOCH_LENGTH) {
      payload = Buffer.alloc(6, 0);
      payload.writeUInt8(this.type, 0);
      writeLengths(0, 0);
      payload.writeUInt32BE(this.options.epochLength, 2);
    } else if (this.type === Type.MIN_GAS_PRICE) {
      payload = Buffer.alloc(10, 0);
      payload.writeUInt8(this.type, 0);
      writeLengths(0, 0);
      const valueHex = BigInt(this.options.minGasPrice).toString(16);
      payload.write(valueHex.padStart(16, '0'), 2, 8, 'hex');
    } else if (this.type === Type.VALIDATOR_JOIN) {
      payload = Buffer.alloc(60, 0);
      payload.writeUInt8(this.type, 0);
      writeLengths(0, 0);
      payload.writeUInt16BE(this.options.slotId, 2);
      payload.write(this.options.tenderKey.replace('0x', ''), 4, 'hex');
      payload.writeUInt32BE(this.options.eventsCount, 36);
      payload.write(this.options.signerAddr.replace('0x', ''), 40, 'hex');
    } else if (this.type === Type.VALIDATOR_LOGOUT) {
      payload = Buffer.alloc(64, 0);
      payload.writeUInt8(this.type, 0);
      writeLengths(0, 0);
      payload.writeUInt16BE(this.options.slotId, 2);
      payload.write(this.options.tenderKey.replace('0x', ''), 4, 'hex');
      payload.writeUInt32BE(this.options.eventsCount, 36);
      payload.writeUInt32BE(this.options.activationEpoch, 40);
      payload.write(this.options.newSigner.replace('0x', ''), 44, 'hex');
    } else if (this.type === Type.PERIOD_VOTE) {
      payload = Buffer.alloc(3, 0);
      payload.writeUInt8(this.type, 0);
      writeLengths(1, 0);
      payload.writeUInt8(this.options.slotId, 2);
      inputs = this.inputs;
    } else if (this.type === Type.EXIT) {
      payload = Buffer.alloc(34, 0);
      payload.writeUInt8(this.type, 0);
      arrayToRaw(this.inputs).copy(payload, 1, 0, 33);
    } else if (this.type === Type.TRANSFER) {
      payload = Buffer.alloc(2, 0);
      payload.writeUInt8(this.type, 0);
      writeLengths(this.inputs.length, this.outputs.length);
      inputs = this.inputs;
    } else if (this.type === Type.SPEND_COND) {
      payload = Buffer.alloc(2, 0);
      payload.writeUInt8(this.type, 0);
      writeLengths(this.inputs.length, this.outputs.length);
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
      inputs: this.inputs.map(inp => inp.toJSON()),
      outputs: this.outputs.map(out => out.toJSON()),
    };

    if (this.isSigned()) {
      json.hash = this.hash();
    }

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
        if ((dataBuf.length !== (OUT_LENGTH + 6)) && (dataBuf.length !== (NST_OUT_LENGTH + 6))) {
          throw new Error('malformed deposit tx.');
        }
        const depositId = dataBuf.readUInt32BE(2);
        const output = Output.fromRaw(dataBuf.slice(6));
        return new Transaction(Type.DEPOSIT, [], [output], { depositId });
      }
      case Type.EPOCH_LENGTH: {
        if (dataBuf.length !== 6) {
          throw new Error('malformed epoch tx.');
        }
        const epochLength = dataBuf.readUInt32BE(2);
        return Transaction.epochLength(epochLength);
      }
      case Type.MIN_GAS_PRICE: {
        if (dataBuf.length !== 10) {
          throw new Error('malformed gas price tx.');
        }
        const gasString = toHexString(dataBuf.slice(2, 10));
        const minGasPrice = BigInt(gasString);
        return Transaction.minGasPrice(minGasPrice);
      }
      case Type.VALIDATOR_JOIN: {
        if (dataBuf.length !== 60) {
          throw new Error('malformed validatorJoin tx.');
        }
        const slotId = dataBuf.readUInt16BE(2);
        const tenderKey = `0x${dataBuf.slice(4, 36).toString('hex')}`;
        const eventsCount = dataBuf.readUInt32BE(36);
        const signerAddr = `0x${dataBuf.slice(40, 60).toString('hex')}`;
        return Transaction.validatorJoin(slotId, tenderKey, eventsCount, signerAddr);
      }
      case Type.VALIDATOR_LOGOUT: {
        if (dataBuf.length !== 64) {
          throw new Error('malformed validatorLogout tx.');
        }
        const slotId = dataBuf.readUInt16BE(2);
        const tenderKey = `0x${dataBuf.slice(4, 36).toString('hex')}`;
        const eventsCount = dataBuf.readUInt32BE(36);
        const activationEpoch = dataBuf.readUInt32BE(40);
        const newSigner = `0x${dataBuf.slice(44, 64).toString('hex')}`;
        return Transaction.validatorLogout(
          slotId,
          tenderKey,
          eventsCount,
          activationEpoch,
          newSigner,
        );
      }
      case Type.PERIOD_VOTE: {
        if (dataBuf.length !== 101) {
          throw new Error('malformed periodVote tx.');
        }
        const slotId = dataBuf.readUInt8(2);
        const ins = [];
        const sigHashBuf = dataBuf.slice(3, 35);
        ins.push(Input.fromRaw(dataBuf, 3, sigHashBuf));
        return new Transaction(Type.PERIOD_VOTE, ins, [], { slotId });
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
        const sigHashBuf = ethUtil.hashPersonalMessage(
          Transaction.sigDataBufStatic(type, dataBuf, insLength),
        );
        for (let i = 0; i < insLength; i += 1) {
          ins.push(Input.fromRaw(dataBuf, 2 + (i * SPEND_INPUT_LENGTH), sigHashBuf));
        }
        const outs = [];
        let offset = 2 + (insLength * SPEND_INPUT_LENGTH);
        for (let i = 0; i < outsLength; i += 1) {
          const out = Output.fromRaw(dataBuf, offset);

          offset += out.getSize();
          outs.push(out);
        }
        return new Transaction(type, ins, outs);
      }
      case Type.SPEND_COND: {
        const insOuts = dataBuf.readUInt8(1);
        const insLength = insOuts >> 4; // eslint-disable-line no-bitwise
        const outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
        const ins = [];
        let offset = 2;
        const sigHashBuf = ethUtil.hashPersonalMessage(
          Transaction.sigDataBufStatic(type, dataBuf, insLength),
        );
        for (let i = 0; i < insLength; i += 1) {
          let input;
          if (i === 0) {
            input = Input.fromRaw(dataBuf, offset, i === 0 ? Type.SPEND_COND : 0);
          } else {
            input = Input.fromRaw(dataBuf, offset, sigHashBuf)
          }

          ins.push(input);
          offset += input.getSize();
        }
        const outs = [];
        for (let i = 0; i < outsLength; i += 1) {
          const out = Output.fromRaw(dataBuf, offset);

          offset += out.getSize();
          outs.push(out);
        }
        return new Transaction(Type.SPEND_COND, ins, outs);
      }
      default: {
        throw new Error(`unknown transaction type: ${type}.`);
      }
    }
  }

}
