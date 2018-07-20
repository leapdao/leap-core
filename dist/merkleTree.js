'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _createClass = function () {function defineProperties(target, props) {for (var i = 0; i < props.length; i++) {var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);}}return function (Constructor, protoProps, staticProps) {if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;};}();
/**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * Copyright (c) 2018-present, Parsec Labs (parseclabs.org)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * This source code is licensed under the GNU Affero General Public License,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * version 3, found in the LICENSE file in the root directory of this source
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  * tree.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  */

// Adopted from: https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/test/helpers/merkleTree.js
// Changes:
// - Removed sorting and deduplication
// - Added padding to even number of elements
var _ethereumjsUtil = require('ethereumjs-util');function _classCallCheck(instance, Constructor) {if (!(instance instanceof Constructor)) {throw new TypeError("Cannot call a class as a function");}}

/* eslint-disable class-methods-use-this */var
MerkleTree = function () {

  function MerkleTree(elements) {_classCallCheck(this, MerkleTree);
    // Filter empty strings and hash elements
    this.elements = elements.filter(function (el) {return el;});

    if (this.elements.length % 2 !== 0) {
      this.elements.push(Buffer.alloc(32, 0));
    }

    // Create layers
    this.layers = this.getLayers(this.elements);
  }_createClass(MerkleTree, [{ key: 'getLayers', value: function getLayers(

    elements) {
      if (elements.length === 0) {
        return [['']];
      }

      var layers = [];
      layers.push(elements);

      // Get next layer until we reach the root
      while (layers[layers.length - 1].length > 1) {
        layers.push(this.getNextLayer(layers[layers.length - 1]));
      }

      return layers;
    } }, { key: 'getNextLayer', value: function getNextLayer(

    elements) {var _this = this;
      return elements.reduce(function (layer, el, idx, arr) {
        if (idx % 2 === 0) {
          // Hash the current element with its pair element
          layer.push(_this.combinedHash(el, arr[idx + 1]));
        }

        return layer;
      }, []);
    } }, { key: 'combinedHash', value: function combinedHash(

    first, second) {
      if (!first) {return second;}
      if (!second) {return first;}

      return (0, _ethereumjsUtil.sha3)(Buffer.concat([first, second]));
    } }, { key: 'getRoot', value: function getRoot()

    {
      return this.layers[this.layers.length - 1][0];
    } }, { key: 'getHexRoot', value: function getHexRoot()

    {
      return (0, _ethereumjsUtil.bufferToHex)(this.getRoot());
    } }, { key: 'getProof', value: function getProof(

    el) {var _this2 = this;
      var idx = this.bufIndexOf(el, this.elements);

      if (idx === -1) {
        throw new Error('Element does not exist in Merkle tree');
      }

      return this.layers.reduce(function (proof, layer) {
        var pairElement = _this2.getPairElement(idx, layer);

        if (pairElement) {
          proof.push(pairElement);
        }

        idx = Math.floor(idx / 2);

        return proof;
      }, []);
    } }, { key: 'getHexProof', value: function getHexProof(

    el) {
      var proof = this.getProof(el);

      return this.bufArrToHexArr(proof);
    } }, { key: 'getPairElement', value: function getPairElement(

    idx, layer) {
      var pairIdx = idx % 2 === 0 ? idx + 1 : idx - 1;

      if (pairIdx < layer.length) {
        return layer[pairIdx];
      }
      return null;
    } }, { key: 'bufIndexOf', value: function bufIndexOf(

    el, arr) {
      var hash = void 0;

      // Convert element to 32 byte hash if it is not one already
      if (el.length !== 32 || !Buffer.isBuffer(el)) {
        hash = (0, _ethereumjsUtil.sha3)(el);
      } else {
        hash = el;
      }

      for (var i = 0; i < arr.length; i++) {
        if (hash.equals(arr[i])) {
          return i;
        }
      }

      return -1;
    } }, { key: 'bufArrToHexArr', value: function bufArrToHexArr(

    arr) {
      if (arr.some(function (el) {return !Buffer.isBuffer(el);})) {
        throw new Error('Array is not an array of buffers');
      }

      return arr.map(function (el) {return '0x' + el.toString('hex');});
    } }]);return MerkleTree;}();


/* eslint-enable class-methods-use-this */exports.default = MerkleTree;module.exports = exports['default'];