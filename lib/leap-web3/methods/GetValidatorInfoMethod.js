import {AbstractCallMethod} from 'web3-core-method'

export default class GetValidatorInfoMethod extends AbstractCallMethod {
  /**
   * @param {Utils} utils
   * @param {Object} formatters
   *
   * @constructor
   */
  constructor(utils, formatters) {
    super("validator_getAddress", 0, utils, formatters);
  }
}