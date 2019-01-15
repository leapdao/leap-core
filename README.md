# leap-core
[![Build Status](https://travis-ci.org/leapdao/leap-core.svg?branch=master)](https://travis-ci.org/leapdao/leap-core)
[![codecov](https://codecov.io/gh/leapdao/leap-core/branch/master/graph/badge.svg)](https://codecov.io/gh/leapdao/leap-core)

test:
```
yarn
yarn test
```

install:
```
yarn add -S leap-core
```

## Create Transaction Proof:

```
const transfer = Tx.transfer(height, ins, outs).sign(privKey);
const block = new Block(parent, height);
block.proof(transfer.toRaw(), position, [SIBLING_HASH, SIBLING_HASH])
```


## LICENSE

Most source files (lib folder and below) are made available under the terms of the GNU Affero General Public License (GNU AGPLv3). See individual files for details.
