import {AbstractCallMethod} from 'web3-core-method'

export default class GetConfigMethod extends AbstractCallMethod {
  /**
   * @param {Utils} utils
   * @param {Object} formatters
   *
   * @constructor
   */
  constructor(utils, formatters) {
    super("plasma_getConfig", 0, utils, formatters);
  }
}