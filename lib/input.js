
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

import assert from 'assert';
import ethUtils from 'ethereumjs-util';
import Outpoint from './outpoint';
import Util from './util';

// outpoint(32 bytes prev tx + 1 byte output pos)
export const SPEND_INPUT_LENGTH = 33;

export default class Input {
  constructor(options) {
    if (Outpoint.isOutpoint(options)) {
      this.prevout = options;
    } else if (Util.isU32(options)) {
      this.depositId = options;
    } else if (options && options.prevout) {
      this.prevout = options.prevout;
    }
  }

  isDeposit() {
    return (this.depositId);
  }

  isSpend() {
    return (this.prevout);
  }

  /**
   * Calculate size of input.
   * @returns {Number}
   */
  getSize() {
    if (this.isDeposit()) {
      return 4;
    }
    if (this.isSpend()) {
      return SPEND_INPUT_LENGTH;
    }
    return 0;
  }

  toJSON() {
    if (this.isDeposit()) {
      return {
        depositId: this.depositId,
      };
    }
    if (this.isSpend()) {
      const input = { ...this.prevout };

      input.hash = ethUtils.bufferToHex(input.hash);
      return input;
    }
    return {};
  }

  /**
   * Instantiate input from json object.
   * @param {Object} json
   * @returns {Input}
   */
  static fromJSON(json) {
    assert(json, 'Input data is required.');
    if (json.depositId) {
      return new Input(json.depositId);
    }
    if (json.hash) {
      return new Input(Outpoint.fromJSON(json));
    }
    return null;
  }

  toRaw() {
    const dataBuf = Buffer.alloc(this.getSize());

    if (this.isDeposit()) {
      dataBuf.writeUInt32BE(this.depositId);
    } else if (this.isSpend()) {
      this.prevout.toRaw(dataBuf, 0);
    }

    return dataBuf;
  }

  /**
   * Instantiate input from serialized data.
   * @param {Buffer} data
   * @param {Number} offset
   * @returns {Input}
   */
  static fromRaw(buf, offset) {
    const off = (offset) || 0;
    const prevout = new Outpoint(buf.slice(0 + off, 32 + off), buf.readUInt8(32 + off));

    return new Input(prevout);
  }
}
