/*!
 * encoding.js - encoding utils for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

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
  'hex'
);

/**
 * A hash of all zeroes.
 * @const {String}
 * @default
 */

encoding.NULL_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000';

