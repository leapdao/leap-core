import util from 'ethereumjs-util';

export default class Exit {
  /*
  returns:
    * 0 -  32 bytes utxoid
    * 32 -  32 bytes amount of money
    * 64 -  32 bytes r-signature        
    * 96 -  32 bytes s-signature       
    * 128 -  1 byte v-signature  
  */ 
  static signOverExit(utxoid, amount, privKey) {
    const sigHashBuff = Exit.sigHashBuff(utxoid, amount);
    const sigHash = util.keccak256(sigHashBuff);
    const sig = util.ecsign(
        sigHash,
        Buffer.from(privKey.replace('0x', ''), 'hex'),
    );
    const vBuff = Buffer.alloc(1);
    vBuff.writeInt8(sig.v, 0);
    return Buffer.concat([sigHashBuff, sig.r, sig.s, vBuff]);
  }

  // params:
  //  utxoid: string with 0x, e.g. 0x0000000000000000000000000000000000b447b980aea5accb5fd68789f6b099
  //  amount: plain JS number
  // returns:
  //  64 byte buffer
  static sigHashBuff(utxoid, amount) {
    const buffer_value = util.setLengthLeft(util.toBuffer(amount), 32);
    const buffer_uxoid = Buffer.from(utxoid.replace('0x', ''), 'hex');

    return Buffer.concat([buffer_uxoid, buffer_value]);
  }
}