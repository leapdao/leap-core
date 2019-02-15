import { AbstractCallMethod } from 'web3-core-method'

export default class GetColorsMethod extends AbstractCallMethod {
  /**
   * @param {Utils} utils
   * @param {Object} formatters
   *
   * @constructor
   */
  constructor(utils, formatters) {
    super("plasma_getColors", 0, utils, formatters);

  }

  afterExecution(output) {
    return String(output)
  }
}