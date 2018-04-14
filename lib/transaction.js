import ethUtil from 'ethereumjs-util';
import Signer from './signer';

const MAX_UINT32 = 0xFFFFFFFF;

export const Type = {
  COINBASE: 1,
  DEPOSIT: 2,
  TRANSFER: 3,
  ACCOUNT_SIM: 4,
  COMP_REQ: 5,
  COMP_RESP: 6,
};


export default class Transaction {
  constructor(height) {
    this.height = height;
  }

  coinbase(...args) {
    const [value, addr] = args;
    const payload = Buffer.alloc(29, 0);
    // <1 bytes type>
    payload.writeUInt8(Type.COINBASE, 0);
    // value
    const big = ~~(value / MAX_UINT32);
    payload.writeUInt32BE(big, 1);
    const low = (value % MAX_UINT32) - big;
    payload.writeUInt32BE(low, 5);
    // <20 bytes addr>
    payload.write(addr.replace('0x', ''), 9, 'hex');
    return new Signer(args, payload, Type.COINBASE);
  }

  deposit(...args) {
    const [depositId, value, addr] = args;
    const payload = Buffer.alloc(33, 0);
    // <1 bytes type>
    payload.writeUInt8(Type.DEPOSIT, 0);
    // depositId
    payload.writeUInt32BE(depositId, 1);
    // value
    const big = ~~(value / MAX_UINT32);
    payload.writeUInt32BE(big, 5);
    const low = (value % MAX_UINT32) - big;
    payload.writeUInt32BE(low, 9);
    // <20 bytes addr>
    payload.write(addr.replace('0x', ''), 13, 'hex');
    return new Signer(args, payload, Type.DEPOSIT);
  }

  transfer(...args) {
    const [ins, outs] = args;
    if (ins.length === 0 || ins.length > 2) {
      throw Error('only 1 or 2 ins allowed');
    }
    if (outs.length === 0 || outs.length > 2) {
      throw Error('only 1 or 2 outs allowed');
    }
    const payload = Buffer.alloc(10 + (ins.length * 33) + (outs.length * 28), 0);
    // <1 bytes type>
    payload.writeUInt8(Type.TRANSFER, 0);
    // height
    let big = ~~(this.height / MAX_UINT32);
    payload.writeUInt32BE(big, 1);
    let low = (this.height % MAX_UINT32) - big;
    payload.writeUInt32BE(low, 5);
    // wirte ins and outs length as nibbles
    payload.writeUInt8(16 * ins.length + outs.length, 9);
    for (let i = 0; i < ins.length; i += 1) {
      payload.write(ins[i].prevTx.replace('0x', ''), 10 + (i * 33), 'hex');
      payload.writeUInt8(ins[i].outPos, 42 + (i * 33));
    }
    for (let i = 0; i < outs.length; i += 1) {
      big = ~~(outs[i].value / MAX_UINT32);
      payload.writeUInt32BE(big, 10 + (ins.length * 33) + (i * 28), 'hex');
      low = (outs[i].value % MAX_UINT32) - big;
      payload.writeUInt32BE(low, 14 + (ins.length * 33) + (i * 28), 'hex');
      payload.write(outs[i].addr.replace('0x', ''), 18 + (ins.length * 33) + (i * 28), 'hex');
    }
    return new Signer(args, payload, Type.TRANSFER);
  }


  static parseToParams(transaction) {
    const bufs = this.parseToBuf(transaction);
    if (bufs.type === Type.SETTLE) {
      const v = bufs.parts[2].readUInt8(0);
      bufs.parts[2].writeUInt8(0, 0);
      return [`0x${v.toString(16)}${bufs.parts[0].toString('hex')}${bufs.parts[1].toString('hex')}`, `0x${bufs.parts[2].toString('hex')}`, `0x${bufs.parts[3].toString('hex')}`];
    }
    return bufs.parts.map(buf => `0x${buf.toString('hex')}`);
  }

  static parse(transaction) {
    const dataHex = transaction.replace('0x', '');
    const dataBuf = Buffer.alloc(dataHex.length / 2);
    dataBuf.write(dataHex, 'hex');

    const type = dataBuf.readUInt8(0);

    const rv = { type: type };
    switch (type) {
      case Type.COINBASE: {
        if (dataBuf.length != 29) {
          throw new Error('malformed coinbase tx.');
        }
        rv.outs = [{
          value: parseInt(dataBuf.slice(1, 9).toString('hex'), 16),
          addr: `0x${dataBuf.slice(9, 29).toString('hex')}`,
        }];
        break;
      }
      case Type.DEPOSIT: {
        if (dataBuf.length != 33) {
          throw new Error('malformed deposit tx.');
        }
        rv.ins = [{
          depositId: dataBuf.readUInt32BE(1),
        }]
        rv.outs = [{
          value: parseInt(dataBuf.slice(5, 13).toString('hex'), 16),
          addr: `0x${dataBuf.slice(13, 33).toString('hex')}`,
        }];
        break;
      }
      case Type.TRANSFER: {
        rv.height = parseInt(dataBuf.slice(1, 9).toString('hex'), 16);
        const insOuts = dataBuf.readUInt8(9);
        const insLength = insOuts & 0xF;
        const outsLength = insOuts >> 4;
        rv.ins = [];
        for (let i = 0; i < insLength; i += 1) {
          const input = {
            prevTx: `0x${dataBuf.slice(10 + (i * 33), 42 + (i * 33)).toString('hex')}`,
            outPos: dataBuf.readUInt8(42 + (i * 33)),
          };
          const unsignedLength = 10 + (insLength * 33) + (outsLength * 28);
          if (dataBuf.length > unsignedLength) {
            input.r = `0x${dataBuf.slice(unsignedLength, unsignedLength + 32).toString('hex')}`;
            input.s = `0x${dataBuf.slice(unsignedLength + 32, unsignedLength + 64).toString('hex')}`;
            input.v = dataBuf.readUInt8(unsignedLength + 64);
          }
          rv.ins.push(input);
        }
        rv.outs = [];
        for (let i = 0; i < outsLength; i += 1) {
          const outPos = 10 + (insLength * 33) + (i * 28);
          rv.outs.push({
            value: parseInt(dataBuf.slice(outPos, outPos + 8).toString('hex'), 16),
            addr: `0x${dataBuf.slice(outPos + 8, outPos + 28).toString('hex')}`,            
          });
        }
        break;
      }
      default: {
        throw new Error(`unknown transaction type: ${type}.`);
      }
    }
    return rv;
  }

}
