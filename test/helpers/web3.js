import ethUtils from 'ethereumjs-util';

const assert = require('assert');

const fakeSign = (keys) => (dataToSign, address, cb) => {
  const sigHashBuf = ethUtils.hashPersonalMessage(Buffer.from(dataToSign.replace('0x', ''), 'hex'));
  const sig = ethUtils.ecsign(
    sigHashBuf,
    Buffer.from(keys[0].replace('0x', ''), 'hex'),
  );
  const dataBuf = Buffer.alloc(65);
  sig.r.copy(dataBuf, 0);
  sig.s.copy(dataBuf, 32);
  dataBuf.writeInt8(sig.v, 64);
  cb(null, `0x${dataBuf.toString('hex')}`);
};

const providerSend = (keys) => async ({ method, params, from }, callback) => {
  // would be eth_signTypedData_v1 later
  assert.equal(method, 'eth_signTypedData');
  // [typed data objs..] from
  assert.equal(params.length, 2);

  const typedData = params[0];
  assert.equal(typedData.length, 1, 'expected only one typed data object for now. FIXME if we need more in the future');

  const header = Buffer.from(`${typedData[0].type} ${typedData[0].name}`, 'utf8');
  const data = ethUtils.toBuffer(typedData[0].value);
  const headerHash = ethUtils.keccak256(header);
  const dataHash = ethUtils.keccak256(data);
  const finalhash = ethUtils.keccak256(Buffer.concat([headerHash, dataHash]));

  const sig = ethUtils.ecsign(
    finalhash,
    ethUtils.toBuffer(keys[0])
  );

  const dataBuf = Buffer.alloc(65);

  sig.r.copy(dataBuf, 0);
  sig.s.copy(dataBuf, 32);
  dataBuf.writeInt8(sig.v, 64);
  callback(null, { result: `0x${dataBuf.toString('hex')}` });
}

export default (accounts, keys) => ({
  version: '1',
  currentProvider: {
    send: providerSend(keys),
  },
  eth: {
    personal: {
      sign: fakeSign(keys)
    },
    sign: fakeSign(keys),
    getAccounts: cb => cb(null, accounts),
  },
});
