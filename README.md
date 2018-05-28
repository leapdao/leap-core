# parsec-lib

test:
```
npm install
npm test
```

install:
```
npm i -S parsec-lib
```

## Create Transaction Proof:

```
const transfer = Tx.transfer(height, ins, outs).sign(privKey);
const block = new Block(parent, height);
block.proof(transfer.toRaw(), position, [SIBLING_HASH, SIBLING_HASH])
```

## Create Tip Proof:

```
tbd
```
