import ethUtils from 'ethereumjs-util';

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

export default (accounts, keys) => ({
  version: '1',
  currentProvider: {},
  eth: {
    personal: {
      sign: fakeSign(keys)
    },
    sign: fakeSign(keys),
    getAccounts: cb => cb(null, accounts),
  },
});