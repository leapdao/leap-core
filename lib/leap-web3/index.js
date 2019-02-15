
import * as Utils from 'web3-utils';
import {formatters} from 'web3-core-helpers';
import {MethodModuleFactory} from 'web3-core-method';
import {ProvidersModuleFactory} from 'web3-providers';
import LeapMethodFactory from './factories/LeapMethodFactory'
import LeapModule from './LeapModule';

/**
 * @param provider
 * @param options
 *
 * @returns {LeapModule}
 *
 * @constructor
 */
export default (provider, options) => {
  const methodModuleFactory = new MethodModuleFactory();

  return new LeapModule(
    provider,
    new ProvidersModuleFactory(),
    methodModuleFactory,
    new LeapMethodFactory(methodModuleFactory, Utils, formatters),
    options
  );
};
