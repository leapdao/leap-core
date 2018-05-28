// Adopted from: https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/helpers/merkleTree.js
// Changes:
// - Removed sorting and deduplication
// - Added padding to even number of elements
import { sha3, bufferToHex } from 'ethereumjs-util';

/* eslint-disable class-methods-use-this */
export default class MerkleTree {

  constructor(elements) {
    // Filter empty strings and hash elements
    this.elements = elements.filter(el => el).map(el => sha3(el));

    if (this.elements.length % 2 !== 0) {
      this.elements.push(Buffer.alloc(32, 0));
    }

    // Create layers
    this.layers = this.getLayers(this.elements);
  }

  getLayers(elements) {
    if (elements.length === 0) {
      return [['']];
    }

    const layers = [];
    layers.push(elements);

    // Get next layer until we reach the root
    while (layers[layers.length - 1].length > 1) {
      layers.push(this.getNextLayer(layers[layers.length - 1]));
    }

    return layers;
  }

  getNextLayer(elements) {
    return elements.reduce((layer, el, idx, arr) => {
      if (idx % 2 === 0) {
        // Hash the current element with its pair element
        layer.push(this.combinedHash(el, arr[idx + 1]));
      }

      return layer;
    }, []);
  }

  combinedHash(first, second) {
    if (!first) { return second; }
    if (!second) { return first; }

    return sha3(Buffer.concat([first, second]));
  }

  getRoot() {
    return this.layers[this.layers.length - 1][0];
  }

  getHexRoot() {
    return bufferToHex(this.getRoot());
  }

  getProof(el) {
    let idx = this.bufIndexOf(el, this.elements);

    if (idx === -1) {
      throw new Error('Element does not exist in Merkle tree');
    }

    return this.layers.reduce((proof, layer) => {
      const pairElement = this.getPairElement(idx, layer);

      if (pairElement) {
        proof.push(pairElement);
      }

      idx = Math.floor(idx / 2);

      return proof;
    }, []);
  }

  getHexProof(el) {
    const proof = this.getProof(el);

    return this.bufArrToHexArr(proof);
  }

  getPairElement(idx, layer) {
    const pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

    if (pairIdx < layer.length) {
      return layer[pairIdx];
    }
    return null;
  }

  bufIndexOf(el, arr) {
    let hash;

    // Convert element to 32 byte hash if it is not one already
    if (el.length !== 32 || !Buffer.isBuffer(el)) {
      hash = sha3(el);
    } else {
      hash = el;
    }

    for (let i = 0; i < arr.length; i++) {
      if (hash.equals(arr[i])) {
        return i;
      }
    }

    return -1;
  }

  bufArrToHexArr(arr) {
    if (arr.some(el => !Buffer.isBuffer(el))) {
      throw new Error('Array is not an array of buffers');
    }

    return arr.map(el => `0x${el.toString('hex')}`);
  }

}
/* eslint-enable class-methods-use-this */
