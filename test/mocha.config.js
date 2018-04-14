import es6Promise from 'es6-promise';
import chai from 'chai';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);
es6Promise.polyfill();

global.expect = chai.expect;
