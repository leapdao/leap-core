import {AbstractCallMethod} from 'web3-core-method'

export default class GetColorMethod extends AbstractCallMethod {
  /**
   * @param {Utils} utils
   * @param {Object} formatters
   *
   * @constructor
   */
  constructor(utils, formatters) {
    super("plasma_getColor", 1, utils, formatters);
  }

  beforeExecution() {
    this.parameters[0] = this.formatters.inputAddressFormatter(this.parameters[0])
  }

  afterExecution(output) {
    return parseInt(output, 10)
  }
}
