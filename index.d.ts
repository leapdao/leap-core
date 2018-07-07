declare module "parsec-lib" {
  type TransferOutputObject = {
    value: number;
    address: string;
    storageRoot?: string;
  };

  export type OutputJSON = {
    value: number;
    address: string;
    storageRoot?: string;
  };

  export class Output {
    constructor(valueOrObject: number | TransferOutputObject, address?: string);
    public value: number;
    public address: string;
    public storageRoot?: string;

    public getSize(): number;
    public toJSON(): OutputJSON;
    public toRaw(): Buffer;

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

  type DepositJSON = {
    depositId: number;
  };

  type SpentJSON = OutpointJSON & {
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

  export enum Type {
    DEPOSIT = 2,
    TRANSFER = 3,
    CONSOLIDATE = 4,
    COMP_REQ = 5,
    COMP_RESP = 6,
    EXIT = 7,
  }

  type TxOptions = {
    depositId?: number;
  };

  type TxJSON = {
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

    public static deposit(depositId: number, value: number, address: string, color: number): Tx<Type.DEPOSIT>;
    public static exit(input: Input): Tx<Type.EXIT>;
    public static transfer(inputs: Array<Input>, outputs: Array<Output>): Tx<Type.TRANSFER>;
    public static consolidate(inputs: Array<Input>, output: Output): Tx<Type.CONSOLIDATE>;
    public static compRequest(inputs: Array<Input>, outputs: Array<Output>): Tx<Type.COMP_REQ>;
    public static compResponse(inputs: Array<Input>, outputs: Array<Output>): Tx<Type.COMP_RESP>;

    public static fromJSON<TxType extends Type>(o: {
      type: TxType;
      inputs: Array<InputJSON>;
      outputs: Array<OutputJSON>;
      options?: TxOptions;
    }): Tx<TxType>;
    public static fromRaw(transaction: Buffer | string): Tx<any>;
    static sigHashBufStatic(type: Type, raw: Buffer, inputsLength: number): Buffer;
    static parseToParams(transaction: Tx<any>): string[];

    public getSize(): number;
    public recoverTxSigner(): void;
    public sigHashBuf(): Buffer;
    public sigHash(): string;
    public sign(privKeys: string[]): Tx<TxType>;
    public signAll(privKey: string): Tx<TxType>;
    public hashBuf(): Buffer;
    public hash(): string;
    public hex(): string;
    public equals(another: Tx<TxType>): boolean;
    public toRaw(): Buffer;
    public toJSON(): TxJSON;
  }

  namespace helpers {
    type Unspent = {
      outpoint: Outpoint;
      output: OutputJSON;
    };

    export function calcInputs(unspent: Array<Unspent>, amount: number): Array<Input>;
    export function calcOutputs(unspent: Array<Unspent>, inputs: Array<Input>, from: string, to: string, amount: number): Array<Output>;

    export function extendWeb3(web3Instance: any): any;
  }
}
