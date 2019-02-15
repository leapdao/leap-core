
import {AbstractWeb3Module} from 'web3-core';

export default class LeapModule extends AbstractWeb3Module {
  /**
   * @param {EthereumProvider|HttpProvider|WebsocketProvider|IpcProvider|String} provider
   * @param {ProvidersModuleFactory} providersModuleFactory
   * @param {MethodModuleFactory} methodModuleFactory
   * @param {LeapMethodFactory} customMethodFactory
   * @param {Object} options
   *
   * @constructor
   */
  constructor(provider, providersModuleFactory, methodModuleFactory, customMethodFactory, options) {
    super(provider, providersModuleFactory, methodModuleFactory, customMethodFactory, options);
  }
}
