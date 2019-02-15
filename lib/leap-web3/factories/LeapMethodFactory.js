import { AbstractMethodFactory } from "web3-core-method";
import GetUnspentMethod from "../methods/GetUnspentMethod";
import GetColorsMethod from "../methods/GetColorsMethod";
import GetConfigMethod from "../methods/GetConfigMethod";
import GetColorMethod from "../methods/GetColorMethod";
import GetValidatorInfoMethod from "../methods/GetValidatorInfoMethod";

export default class MethodFactory extends AbstractMethodFactory {
  /**
   * @param {MethodModuleFactory} methodModuleFactory
   * @param {Utils} utils
   * @param {Object} formatters
   *
   * @constructor
   */
  constructor(methodModuleFactory, utils, formatters) {
      super(methodModuleFactory, utils, formatters);

      this.methods = {
          getUnspent: GetUnspentMethod,
          getColors: GetColorsMethod,
          getConfig: GetConfigMethod,
          getColor: GetColorMethod,
          getValidatorInfo: GetValidatorInfoMethod
      };
  }
}
