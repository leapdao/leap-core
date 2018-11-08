
/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

/**
 * @module utils/encoding
 */

const encoding = exports;

/**
 * An empty buffer.
 * @const {Buffer}
 * @default
 */

encoding.DUMMY = Buffer.from([0]);

/**
 * A hash of all zeroes.
 * @const {Buffer}
 * @default
 */

encoding.ZERO_HASH = Buffer.from(
  '0000000000000000000000000000000000000000000000000000000000000000',
  'hex',
);

/**
 * A hash of all zeroes.
 * @const {String}
 * @default
 */

encoding.NULL_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

