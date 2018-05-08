import Signer from './signer';

const EMPTY = '0x0000000000000000000000000000000000000000000000000000000000000000';
const MAX_UINT32 = 0xFFFFFFFF;
const IN_LENGTH = 33 + 65;
const OUT_LENGTH = 28;

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

  coinbase(...args) { // eslint-disable-line class-methods-use-this
    const [value, addr] = args;
    const payload = Buffer.alloc(29, 0);
    // <1 bytes type>
    payload.writeUInt8(Type.COINBASE, 0);
    // value
    const big = ~~(value / MAX_UINT32); // eslint-disable-line no-bitwise
    payload.writeUInt32BE(big, 1);
    const low = (value % MAX_UINT32) - big;
    payload.writeUInt32BE(low, 5);
    // <20 bytes addr>
    payload.write(addr.replace('0x', ''), 9, 'hex');
    return new Signer(args, payload, Type.COINBASE);
  }

  deposit(...args) { // eslint-disable-line class-methods-use-this
    const [depositId, value, addr] = args;
    const payload = Buffer.alloc(33, 0);
    // <1 bytes type>
    payload.writeUInt8(Type.DEPOSIT, 0);
    // depositId
    payload.writeUInt32BE(depositId, 1);
    // value
    const big = ~~(value / MAX_UINT32); // eslint-disable-line no-bitwise
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
    const payload = Buffer.alloc(10 + (ins.length * IN_LENGTH) + (outs.length * OUT_LENGTH), 0);
    // <1 bytes type>
    payload.writeUInt8(Type.TRANSFER, 0);
    // height
    let big = ~~(this.height / MAX_UINT32); // eslint-disable-line no-bitwise
    payload.writeUInt32BE(big, 1);
    let low = (this.height % MAX_UINT32) - big;
    payload.writeUInt32BE(low, 5);
    // wirte ins and outs length as nibbles
    payload.writeUInt8((16 * ins.length) + outs.length, 9);
    // build inputs
    for (let i = 0; i < ins.length; i += 1) {
      payload.write(ins[i].prevTx.replace('0x', ''), 10 + (i * IN_LENGTH), 'hex');
      payload.writeUInt8(ins[i].outPos, 42 + (i * IN_LENGTH));
    }
    // build outputs
    for (let i = 0; i < outs.length; i += 1) {
      big = ~~(outs[i].value / MAX_UINT32); // eslint-disable-line no-bitwise
      payload.writeUInt32BE(big, 10 + (ins.length * IN_LENGTH) + (i * OUT_LENGTH), 'hex');
      low = (outs[i].value % MAX_UINT32) - big;
      payload.writeUInt32BE(low, 14 + (ins.length * IN_LENGTH) + (i * OUT_LENGTH), 'hex');
      payload.write(outs[i].addr.replace('0x', ''), 18 + (ins.length * IN_LENGTH) + (i * OUT_LENGTH), 'hex');
    }
    return new Signer(args, payload, Type.TRANSFER, this.height);
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

    switch (type) {
      case Type.COINBASE: {
        if (dataBuf.length !== 29) {
          throw new Error('malformed coinbase tx.');
        }
        const value = parseInt(dataBuf.slice(1, 9).toString('hex'), 16);
        const addr = `0x${dataBuf.slice(9, 29).toString('hex')}`;
        const coinbase = new Transaction().coinbase(value, addr);
        return coinbase.toJSON();
      }
      case Type.DEPOSIT: {
        if (dataBuf.length !== 33) {
          throw new Error('malformed deposit tx.');
        }
        const depositId = dataBuf.readUInt32BE(1);
        const value = parseInt(dataBuf.slice(5, 13).toString('hex'), 16);
        const addr = `0x${dataBuf.slice(13, 33).toString('hex')}`;
        const deposit = new Transaction().deposit(depositId, value, addr);
        return deposit.toJSON();
      }
      case Type.TRANSFER: {
        const height = parseInt(dataBuf.slice(1, 9).toString('hex'), 16);
        const insOuts = dataBuf.readUInt8(9);
        const insLength = insOuts >> 4; // eslint-disable-line no-bitwise
        const outsLength = insOuts & 0xF; // eslint-disable-line no-bitwise
        const ins = [];
        for (let i = 0; i < insLength; i += 1) {
          const input = {
            prevTx: `0x${dataBuf.slice(10 + (i * IN_LENGTH), 42 + (i * IN_LENGTH)).toString('hex')}`,
            outPos: dataBuf.readUInt8(42 + (i * IN_LENGTH)),
          };
          const r = `0x${dataBuf.slice(43 + (i * IN_LENGTH), 75 + (i * IN_LENGTH)).toString('hex')}`;
          if (r !== EMPTY) {
            input.r = r;
            input.s = `0x${dataBuf.slice(75 + (i * IN_LENGTH), 107 + (i * IN_LENGTH)).toString('hex')}`;
            input.v = dataBuf.readUInt8(107 + (i * IN_LENGTH));
          }
          ins.push(input);
        }
        const outs = [];
        for (let i = 0; i < outsLength; i += 1) {
          const outPos = 10 + (insLength * IN_LENGTH) + (i * OUT_LENGTH);
          outs.push({
            value: parseInt(dataBuf.slice(outPos, outPos + 8).toString('hex'), 16),
            addr: `0x${dataBuf.slice(outPos + 8, outPos + 28).toString('hex')}`,
          });
        }
        let transfer = new Transaction(height).transfer(ins, outs);
        return transfer.toJSON();
      }
      default: {
        throw new Error(`unknown transaction type: ${type}.`);
      }
    }
    return null;
  }

}
