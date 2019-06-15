import { ripemd160, keccak256 } from 'ethereumjs-util';

const getScriptHash = script =>
  ripemd160(keccak256(script.length), keccak256(script));

const getAddress = script =>
  `0x${getScriptHash(script).toString('hex')}`;

export default {
  getScriptHash,
  getAddress,
};