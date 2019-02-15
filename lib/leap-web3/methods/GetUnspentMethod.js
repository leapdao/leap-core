import {AbstractCallMethod} from 'web3-core-method'
import Outpoint from '../../outpoint'

export default class GetUnspentMethod extends AbstractCallMethod {
  /**
   * @param {Utils} utils
   * @param {Object} formatters
   *
   * @constructor
   */
  constructor(utils, formatters) {
    super("plasma_unspent", 1, utils, formatters);
  }

  beforeExecution() {
    this.parameters[0] = this.formatters.inputAddressFormatter(this.parameters[0])
  }

  afterExecution(unspent) {
    return {
      output: unspent.output,
      outpoint: Outpoint.fromRaw(unspent.outpoint),
    }
  }
}
