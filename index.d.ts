/**
 * Copyright (c) 2018-present, Leap DAO (leapdao.org)
 *
 * This source code is licensed under the GNU Affero General Public License,
 * version 3, found in the LICENSE file in the root directory of this source
 * tree.
 */

declare module "leap-core" {
  import Web3 from 'web3';
  import { Callback } from 'web3/types';
  import { Transaction } from 'web3/Eth/types';

  export enum Type {
    DEPOSIT = 2,
    TRANSFER = 3,
    CONSOLIDATE = 4,
    // COMP_REQ = 5,
    // COMP_RESP = 6,
    EXIT = 7,
    VALIDATOR_JOIN = 8,
    VALIDATOR_LOGOUT = 9,
    PERIOD_VOTE = 11,
    EPOCH_LENGTH = 12,
    SPEND_COND = 13,
  }

  export type TransferOutputObject = {
    value: number;
    address: string;
    storageRoot?: string;
  };

  export type OutputJSON = {
    value: number | string;
    address: string;
    color: number;
    storageRoot?: string;
  };

  export class Output {
    constructor(valueOrObject: number | string | TransferOutputObject, address?: string, color?: number);
    public value: number | string;
    public address: string;
    public color: number;
    public storageRoot?: string;

    public isNFT(): boolean;
    public getSize(): number;
    public toJSON(): OutputJSON;
    public toRaw(): Buffer;

    public static isNFT(color: number): boolean;
    public static fromJSON(json: OutputJSON): Output;
    public static fromRaw(buf: Buffer, offset: number, isComp: number): Output;
  }

  export type OutpointJSON = {
    hash: string;
    index: number;
  };

  export class Outpoint {
    constructor(hash: string | Buffer, index: number);
    public hash: Buffer;
    public index: number;

    public equals(prevout: Outpoint): boolean;
    public compare(prevout: Outpoint): boolean;
    public txId(): string;
    public getSize(): number;
    public getUtxoId(): string;
    public toRaw(buf?: Buffer, offset?: number): Buffer;
    public hex(): string;

    public static isOutpoint(obj: any): boolean;
    public static fromRaw(raw: string | Buffer, offset?: number): Outpoint;
    public static fromJSON(json: { hash: string; index: number }): Outpoint;
    public static fromTx(tx: Tx<any>, index: number): Outpoint;
  }

  export type DepositJSON = {
    depositId: number;
  };

  export type SpentJSON = OutpointJSON & {
    hash: string;
    r?: string;
    s?: string;
    v?: number;
    signer?: string;
  };

  export type InputJSON = DepositJSON | SpentJSON;

  export class Input {
    constructor(options: Outpoint | number | { prevout: Outpoint, type: Type });
    public prevout?: Outpoint;
    public type?: Type;
    public depositId?: number;
    public signer?: string;

    public setSigner(signer: string): void;
    public isComputation(): boolean;
    public isConsolidation(): boolean;
    public isDeposit(): boolean;
    public isSpend(): boolean;
    public getSize(): number;
    public setSig(r: Buffer, s: Buffer, v: number, signer?: string): void;
    public recoverSigner(sigHashBuf: Buffer): void;
    public toJSON(): InputJSON;
    public toRaw(): Buffer;

    public static fromJSON(json: InputJSON): Input;
    public static fromRaw(buf: Buffer, offset: number, sigHashBuf: Buffer): Input;

    public static recoverSignerAddress(sigHashBuf: Buffer, v: number, r: Buffer, s: Buffer): string;
  }

  export type InputTx = { 
    index: number;
    tx: LeapTransaction;
  };

  export interface LeapTransaction extends Transaction {
    raw: string;
  }

  export type TxOptions = {
    depositId?: number;
    slotId?: number;
    tenderKey?: string;
    activationEpoch?: number;
  };

  export type TxJSON = {
    type: Type;
    hash: string;
    inputs: Array<InputJSON>;
    outputs: Array<OutputJSON>;
    options?: TxOptions;
  };

  class Tx<TxType extends Type> {
    public type: TxType;
    public inputs: Array<Input>;
    public outputs: Array<Output>;
    public options?: TxOptions;

    public static validatorJoin(slotId: number, tenderKey: string, eventsCount: number, signerAddr: string): Tx<Type.VALIDATOR_JOIN>;
    public static validatorLogout(slotId: number, tenderKey: string, eventsCount: number, activationEpoch: number, newSigner: string): Tx<Type.VALIDATOR_LOGOUT>;
    public static deposit(depositId: number, value: number, address: string, color: number): Tx<Type.DEPOSIT>;
    public static epochLength(epochLength: number): Tx<Type.EPOCH_LENGTH>;
    public static exit(input: Input): Tx<Type.EXIT>;
    public static transfer(inputs: Array<Input>, outputs: Array<Output>): Tx<Type.TRANSFER>;
    public static consolidate(inputs: Array<Input>, output: Output): Tx<Type.CONSOLIDATE>;
    public static spendCond(inputs: Array<Input>, outputs: Array<Output>): Tx<Type.SPEND_COND>;

    public static fromJSON<TxType extends Type>(o: {
      type: TxType;
      inputs: Array<InputJSON>;
      outputs: Array<OutputJSON>;
      options?: TxOptions;
    }): Tx<TxType>;
    public static fromRaw(transaction: Buffer | string): Tx<any>;
    static sigDataStatic(type: Type, raw: Buffer, inputsLength: number): Buffer;
    static parseToParams(transaction: Tx<any>): string[];
    static signMessageWithWeb3(web3: Web3, message: string): Promise<{
      r: string;
      s: string;
      v: number;
      signer: string;
    }>;

    public getSize(): number;
    public recoverTxSigner(): void;
    public sigHashBuf(): Buffer;
    public sigHash(): string;
    public sigDataBuf(): Buffer;
    public sigData(): string;
    public sign(privKeys: string[]): Tx<TxType>;
    public signAll(privKey: string): Tx<TxType>;
    public getConditionSig(privKey: string): {[k: string]: any};
    public signWeb3(web3: Web3): Promise<Tx<TxType>>;
    public hashBuf(): Buffer;
    public hash(): string;
    public hex(): string;
    public equals(another: Tx<TxType>): boolean;
    public toRaw(): Buffer;
    public toJSON(): TxJSON;
  }

  class MerkleTree {
    constructor(elements: Buffer[]);
    getLayers(elements: Buffer[]);
    getNextLayer(elements: Buffer[]);
    combinedHash(first: Buffer, second: Buffer): Buffer;
    getRoot(): Buffer;
    getHexRoot(): string;
    getProof(el: Buffer): Buffer[];
    getHexProof(el: Buffer): string[];
    getPairElement(idx: number, layer: Buffer[]);
    bufIndexOf(el: Buffer, arr: Buffer[]);
    bufArrToHexArr(arr: Buffer[]): string[];
  }

  export type BlockOptions = {
    timestamp: number;
    txs: Array<Tx<any>>;
  };

  export type BlockJSON = {
    height: number;
    timestamp: number;
    txs: Array<TxJSON>;
  };

  class Block {
    constructor(height: number, options: BlockOptions);
    public addTx(tx: Tx<any>): Block;
    public getMerkleTree(): MerkleTree;
    public merkleRoot(): string;
    public header(payload: Buffer): Buffer;
    public hash(): string;
    public hex(): string;
    public equals(another: Block): boolean;
    public getSize(): number;

    public toJSON(): BlockJSON;
    public static fromJSON(json: BlockJSON): Block;

    public toRaw(): Buffer;
    public static fromRaw(raw: Buffer): Block;

    public proof(tx: Tx<any>, proofOffset: number): Proof;

    public static from(height: number, timestamp: number, txList: LeapTransaction[]): Block;
  }

  class Period {
    constructor(prevHash: string, blocks: Array<Block>);
    addBlock(block: Block): Period;
    getMerkleTree(): MerkleTree;
    merkleRoot(): string;
    proof(tx: Tx<any>): Proof;
    static periodForBlockRange(plasma: ExtendedWeb3, startBlock: number, endBlock: number): Promise<Period>;
    static periodForTx(plasma: ExtendedWeb3, tx: LeapTransaction): Promise<Period>;
  }

  export type Proof = string[];

  export type Unspent = {
    outpoint: Outpoint;
    output: OutputJSON;
  };

  export type NodeConfig = {
    peers?: string[],
    genesis?: {
      app_hash: string;
      chain_id: string;
      consensus_params: any;
      genesis_time: string;
      validators: Array<{
        name: string;
        power: string;
        pub_key: {
          type: string;
          value: string;
        }
      }>
    },
    network: string;
    rootNetwork: string;
    exitHandlerAddr: string;
    bridgeAddr: string;
    operatorAddr: string;
  };

  class ExtendedWeb3 extends Web3 {
    public getUnspent(address: string, cb?: Callback<Array<Unspent>>): Promise<Array<Unspent>>;
    public getColor(tokenContractAddress: string, cb?: Callback<number>): Promise<number>;
    public getColors(cb?: Callback<string[]>): Promise<string[]>;
    public status(cb?: Callback<string>): Promise<string>;
    public getConfig(cb?: Callback<NodeConfig>): Promise<NodeConfig>;
  }

  namespace helpers {
    export function calcInputs(unspent: Array<Unspent>, from: string, amount: number, color: number): Array<Input>;
    export function calcOutputs(unspent: Array<Unspent>, inputs: Array<Input>, from: string, to: string, amount: number, color): Array<Output>;

    export function extendWeb3(web3Instance: Web3 | any): ExtendedWeb3;
    export function periodBlockRange(blockNumber: number): Array<number>[2];
    export function getTxWithYoungestBlock(txs: LeapTransaction[]): InputTx;
    export function getYoungestInputTx(plasma: ExtendedWeb3, tx: Tx<any>): Promise<InputTx>;
    export function getProof(plasma: ExtendedWeb3, tx: LeapTransaction): Promise<Proof>;
  }
}
