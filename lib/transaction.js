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
import Input from './input';
import Output, { OUT_LENGTH, NST_OUT_LENGTH } from './output';
import Outpoint from './outpoint';
import {
  arrayToRaw,
  toHexString,
  ensureSafeValue,
  sigFromString,
  readVarInt,
  writeVarInt,
  varIntSize,
} from './util';
import Type from './type';

const EIP712_SIGNING_DATA = {
  type: 'bytes32',
  name: '\u2728\u270d Transaction Signature',
};
const EIP712_SIGNING_HEADER = ethUtil.keccak256(
  Buffer.from(`${EIP712_SIGNING_DATA.type} ${EIP712_SIGNING_DATA.name}`, 'utf8')
);

export default class Transaction {
  constructor(type, inputs = [], outputs = [], options) {
    this.type = type;
    this.inputs = inputs;
    this.outputs = outputs;
    this.options = Object.assign({}, options || {});

    if (this.options.signatures) {
      this.options.signatures = this.options.signatures.map(sigFromString);
    }

    if (type === Type.SPEND_COND) {
      const script = this.options.script || Buffer.alloc(0);
      const msgData = this.options.msgData || Buffer.alloc(0);

      this.options.script = ethUtil.toBuffer(script);
      this.options.msgData = ethUtil.toBuffer(msgData);

      return this;
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

  static spendCond(inputs, outputs, options) {
    return new Transaction(Type.SPEND_COND, inputs, outputs, options);
  }

  setScript(script) {
    if (this.type !== Type.SPEND_COND) {
      throw new Error('Can only set script on SPEND_COND');
    }

    this.options.script = ethUtil.toBuffer(script);
  }

  setMsgData(msgData) {
    if (this.type !== Type.SPEND_COND) {
      throw new Error('Can only set msgData on SPEND_COND');
    }

    this.options.msgData = ethUtil.toBuffer(msgData);
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

    return this.toRaw().length;
  }

  sigDataBuf() {
    const buffers = [];

    let len = this.inputs.length;
    for (let i = 0; i < len; i += 1) {
      buffers.push(this.inputs[i].toRaw());
    }

    len = this.outputs.length;
    for (let i = 0; i < len; i += 1) {
      buffers.push(this.outputs[i].toRaw());
    }

    return ethUtil.keccak256(Buffer.concat(buffers));
  }

  // Returns sigData as hex string
  sigData() {
    return ethUtil.bufferToHex(this.sigDataBuf());
  }

  sigHashBuf() {
    const dataHash = ethUtil.keccak256(this.sigDataBuf());
    return ethUtil.keccak256(Buffer.concat([EIP712_SIGNING_HEADER, dataHash]));
  }

  sigHash() {
    return ethUtil.bufferToHex(this.sigHashBuf());
  }

  // TODO: seems like we switch to EIP-712 ;)
  // https://eips.ethereum.org/EIPS/eip-712
  // Ethereum typed structured data hashing and signing
  // xxx
  sign(privKeys) {
    /*
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
    } */

    const sigHashBuf = this.sigHashBuf();

    this.options.signatures = this.options.signatures || [];
    for (let i = 0; i < privKeys.length; i++) {
      const sig = ethUtil.ecsign(
        sigHashBuf,
        ethUtil.toBuffer(privKeys[i])
      );

      this.options.signatures.push(sig);
    }

    return this;
  }

  getSigners() {
    if (!this.options.signatures) {
      return [];
    }

    const ret = [];
    const sigHashBuf = this.sigHashBuf();
    const len = this.options.signatures.length;

    for (let i = 0; i < len; i++) {
      const sig = this.options.signatures[i];
      const pubKey = ethUtil.ecrecover(sigHashBuf, sig.v, sig.r, sig.s);
      const addrBuf = ethUtil.pubToAddress(pubKey);
      ret.push(ethUtil.bufferToHex(addrBuf));
    }

    return ret;
  }

  static signMessageWithWeb3(web3, message, accountIndex = 0) {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line consistent-return
      web3.eth.getAccounts((err, accounts) => {
        if (err) {
          return reject(`getAccounts err: ${err}`);
        }

        if (!accounts[accountIndex]) {
          return reject(new Error(`No account at index ${accountIndex}`));
        }

        const from = accounts[accountIndex];
        const msgParams = [Object.assign({ value: message }, EIP712_SIGNING_DATA)];

        web3.currentProvider.send(
          {
            method: 'eth_signTypedData',
            params: [msgParams, from],
            from,
          },
          (error, result) => {
            if (error || result.error) {
              return reject(error || result.error);
            }

            const { r, s, v } = ethUtil.fromRpcSig(result.result);

            return resolve({ r, s, v, signer: accounts[accountIndex] });
          }
        );
      });
    });
  }

  signWeb3(web3, accountIndex = 0) {
    /* if (this.type === Type.PERIOD_VOTE) {
      return Transaction.signMessageWithWeb3(web3, this.inputs[0].prevout.hash, accountIndex)
        .then(({ r, s, v, signer }) => {
          this.inputs[0].setSig(r, s, v, signer);
          return this;
        });
    } */

    this.options.signatures = this.options.signatures || [];
    return Transaction.signMessageWithWeb3(web3, this.sigData(), accountIndex)
      .then(({ r, s, v }) => {

        this.options.signatures.push({ v, r, s });

        return this;
      });
  }

  // Returns tx hash as Buffer
  hashBuf() {
    if (!this.isSigned()) {
      throw Error('not signed yet');
    }

    const raw = this.toRaw();
    return ethUtil.keccak256(raw);
  }

  // TRANSFER, SPEND_COND and PERIOD_VOTE needs to be signed
  isSigned() {
    return (
      this.type !== Type.TRANSFER &&
      this.type !== Type.SPEND_COND &&
      this.type !== Type.PERIOD_VOTE
    ) || (this.options.signatures ? this.options.signatures.length !== 0 : false);
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
    let additionalPayload;
    let inputs = [];
    if (this.type === Type.DEPOSIT) {
      payload = Buffer.alloc(6, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt8(16 + 1, 1);  // 1 inputs, 1 output
      payload.writeUInt32BE(this.options.depositId, 2);
    } else if (this.type === Type.EPOCH_LENGTH) {
      payload = Buffer.alloc(6, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt8(0, 1); // 0 inputs, 0 output
      payload.writeUInt32BE(this.options.epochLength, 2);
    } else if (this.type === Type.MIN_GAS_PRICE) {
      payload = Buffer.alloc(10, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt8(0, 1); // 0 inputs, 0 output
      const valueHex = BigInt(this.options.minGasPrice).toString(16);
      payload.write(valueHex.padStart(16, '0'), 2, 8, 'hex');
    } else if (this.type === Type.VALIDATOR_JOIN) {
      payload = Buffer.alloc(60, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt8(0, 1); // 0 inputs, 0 output
      payload.writeUInt16BE(this.options.slotId, 2);
      payload.write(this.options.tenderKey.replace('0x', ''), 4, 'hex');
      payload.writeUInt32BE(this.options.eventsCount, 36);
      payload.write(this.options.signerAddr.replace('0x', ''), 40, 'hex');
    } else if (this.type === Type.VALIDATOR_LOGOUT) {
      payload = Buffer.alloc(64, 0);
      payload.writeUInt8(this.type, 0);
      payload.writeUInt8(0, 1); // 0 inputs, 0 output
      payload.writeUInt16BE(this.options.slotId, 2);
      payload.write(this.options.tenderKey.replace('0x', ''), 4, 'hex');
      payload.writeUInt32BE(this.options.eventsCount, 36);
      payload.writeUInt32BE(this.options.activationEpoch, 40);
      payload.write(this.options.newSigner.replace('0x', ''), 44, 'hex');
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
    } else if (this.type === Type.TRANSFER || this.type === Type.SPEND_COND) {
      payload = Buffer.alloc(2, 0);
      payload.writeUInt8(this.type, 0);
      // write ins and outs length as nibbles
      payload.writeUInt8((16 * this.inputs.length) + this.outputs.length, 1);
      inputs = this.inputs;
    } else {
      payload = Buffer.alloc(1, 0);
      payload.writeUInt8(this.type, 0);
      inputs = this.inputs;
    }

    if (this.options) {
      const buffers = [additionalPayload || Buffer.alloc(0)];

      // check for signatures
      if (this.type === Type.SPEND_COND || this.type === Type.TRANSFER || this.type === Type.PERIOD_VOTE) {
        const signatures = this.options.signatures || [];
        const sigLen = signatures.length;
        const varInt = varIntSize(sigLen);
        const varBuf = Buffer.alloc(varInt);

        // write number of sigs
        writeVarInt(varBuf, sigLen, 0);
        buffers.push(varBuf);

        // append the sigs
        for (let i = 0; i < sigLen; i++) {
          const sig = signatures[i];
          const v = Buffer.alloc(1);

          v[0] = sig.v;
          buffers.push(v);
          buffers.push(sig.r);
          buffers.push(sig.s);
        }
      }

      if (this.type === Type.SPEND_COND) {
        // script
        let dataLen = this.options.script.length;
        let varInt = varIntSize(dataLen);
        let varBuf = Buffer.alloc(varInt);

        writeVarInt(varBuf, dataLen, 0);
        buffers.push(varBuf);
        buffers.push(this.options.script);

        // msgData
        dataLen = this.options.msgData.length;
        varInt = varIntSize(dataLen);
        varBuf = Buffer.alloc(varInt);

        writeVarInt(varBuf, dataLen, 0);
        buffers.push(varBuf);
        buffers.push(this.options.msgData);
      }

      additionalPayload = Buffer.concat(buffers);
    }

    return Buffer.concat(
      [
        payload,
        arrayToRaw(inputs),
        arrayToRaw(this.outputs),
        additionalPayload || Buffer.alloc(0),
      ]
    );
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
      json.options = Object.assign({}, this.options);

      if (this.options.signatures) {
        const sigs = [];
        const len = this.options.signatures.length;

        for (let i = 0; i < len; i++) {
          const sig = this.options.signatures[i];
          const v = sig.v.toString(16).padStart(2, '0');

          sigs.push(`0x${v + sig.r.toString('hex') + sig.s.toString('hex')}`);
        }

        json.options.signatures = sigs;
      }
    }

    if (this.type === Type.SPEND_COND) {
      json.script = ethUtil.bufferToHex(this.options.script);
      json.msgData = ethUtil.bufferToHex(this.options.msgData);
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
        // dataBuf[36] is number of signatures
        if (dataBuf.length !== 102 || dataBuf[36] !== 1) {
          throw new Error('malformed periodVote tx.');
        }

        const slotId = dataBuf.readUInt8(2);
        const ins = [];
        const sig = {};

        sig.v = dataBuf[37];
        sig.r = dataBuf.slice(38, 70);
        sig.s = dataBuf.slice(70, 102);
        ins.push(Input.fromRaw(dataBuf, 3));

        const options = { slotId, signatures: [sig] };

        return new Transaction(Type.PERIOD_VOTE, ins, [], options);
      }
      case Type.EXIT: {
        if (dataBuf.length !== 34) {
          throw new Error('malformed exit tx.');
        }
        const outpoint = Outpoint.fromRaw(dataBuf, 1);
        return new Transaction(Type.EXIT, [new Input(outpoint)], []);
      }
      case Type.SPEND_COND:
      case Type.TRANSFER: {
        const insOuts = dataBuf.readUInt8(1);
        const insLength = insOuts >> 4; // eslint-disable-line no-bitwise
        const outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
        const ins = [];
        const outs = [];

        let offset = 2;
        for (let i = 0; i < insLength; i += 1) {
          const input = Input.fromRaw(dataBuf, offset);

          offset += input.getSize();
          ins.push(input);
        }

        for (let i = 0; i < outsLength; i += 1) {
          const out = Output.fromRaw(dataBuf, offset);

          offset += out.getSize();
          outs.push(out);
        }

        const options = {};
        const signatures = [];
        const bufLen = dataBuf.length;

        let ctr = 0;
        while (offset < bufLen) {
          const varInt = readVarInt(dataBuf, offset);

          offset += varInt.size;
          if (varInt.value > 0) {
            // do we have sigs?
            if (ctr === 0)  {
              const value = varInt.value;

              for (let i = 0; i < value; i++) {
                const sig = {};
                sig.v = dataBuf[offset];
                offset += 1;
                sig.r = dataBuf.slice(offset, offset + 32);
                offset += 32;
                sig.s = dataBuf.slice(offset, offset + 32);
                offset += 32;

                signatures.push(sig);
              }
              options.signatures = signatures;
            }

            if (ctr === 1 && type === Type.SPEND_COND) {
              // script
              options.script = dataBuf.slice(offset, offset += varInt.value);
            }
            if (ctr === 2 && type === Type.SPEND_COND) {
              // msgData
              options.msgData = dataBuf.slice(offset, offset += varInt.value);
            }
          }

          // increment the index
          ctr += 1;
        }

        return new Transaction(type, ins, outs, options);
      }
      default: {
        throw new Error(`unknown transaction type: ${type}.`);
      }
    }
  }
}
