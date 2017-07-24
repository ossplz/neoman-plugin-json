/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />
/// <reference path="../node_modules/@types/node/index.d.ts" />
import 'mocha';
import * as chai from 'chai';
let expect = chai.expect, assert = chai.assert;
import * as sinon from 'sinon';
import { ParamsModel } from './types';

let JSONPlugin = require('./index');
let JSONParser = require('./parsers/json');

describe('JSONPlugin', () => {
  let p: any;
  beforeEach(() => {
    p = new JSONPlugin();
  });

  describe('#traverse', () => {
    it('should correctly traverse a given object with a given JSONPath', () => {
      let sobj = '{ "chris": ["one", "two", "three"] }';
      let pobj = JSONParser.parse(sobj);
      let tr = p["traverse"](pobj, "$.chris[1]");
      expect(tr).to.exist;
      expect(tr.destination).to.exist;
      expect(tr.destination.type).to.equal("string");
      expect(tr.parent).to.exist;
      expect(tr.parent.destination.type).to.equal("member");
      expect(tr.destination.meta.first_column).to.equal(19);
      expect(tr.destination.meta.last_column).to.equal(24);
    });
    it('should correctly traverse a given object with a given JSONPath', () => {
      let sobj = '{ "nonsense": 1, "chris": ["one", { "two": [1, 3.141] }, "three"] }';
      let pobj = JSONParser.parse(sobj);
      let tr = p["traverse"](pobj, "$.chris[1]");
      expect(tr).to.exist;
      expect(tr.destination).to.exist;
      expect(tr.destination.type).to.equal("object");
      expect(tr.parent).to.exist;
      expect(tr.parent.destination.type).to.equal("member");
      tr = p["traverse"](pobj, "$.chris[1].two[1]");
      expect(tr).to.exist;
      expect(tr.destination).to.exist;
      expect(tr.destination.type).to.equal("number");
      expect(tr.destination.orig).to.equal(3.141);
      expect(tr.destination.v).to.equal("3.141");
      expect(tr.parent).to.exist;
      expect(tr.parent.destination.type).to.equal("member");      
      expect(tr.destination.meta.first_column).to.equal(47);
      expect(tr.destination.meta.last_column).to.equal(52);
    });
    it('should throw when traversing non-existant path', () => {
      assert.throws(() => {
        let sobj = '{ "chris": "something" }';
        let pobj = JSONParser.parse(sobj);
        let tr = p["traverse"](pobj, "$.john[1]");
      });
      assert.throws(() => {
        let sobj = '{ "chris": ["one", "two", "three"] }';
        let pobj = JSONParser.parse(sobj);
        let tr = p["traverse"](pobj, "$.chris[1].john");
      });
    });
    it('should set subject according to depth', () => {
      let sobj = '{ "nonsense": 1, "chris": ["one", { "two": [1, 3.141] }, "three"] }';
      let pobj = JSONParser.parse(sobj);

      let tr = p["traverse"](pobj, "$.chris[1]");

      expect(tr.subject).to.equal('$["chris"][1]');
      expect(tr.parent.subject).to.equal('$["chris"]');
      expect(tr.parent.parent.subject).to.equal("$");
    });
  });

  describe('#applyTransform', () => {
    it('should get transform value', () => {
      let stub = sinon.stub();
      p["getTransformValue"] = stub;
      let content = "chris was here";
      let subject = "";
      let travResult = { destination: { meta: { range: [6, 9] } } };
      let params = new ParamsModel();

      p["applyTransform"](content, subject, travResult, "", params);

      sinon.assert.calledWith(stub, "", subject, travResult, params);
    });
    it('should replace the string component with a string at the right location', () => {
      let content = "chris was here";
      let subject = "";
      let travResult = { destination: { meta: { range: [6, 9] } } };
      let params = new ParamsModel();
      let result = p["applyTransform"](content, subject, travResult, "is", params);
      expect(result).to.equal("chris \"is\" here");
    });
    it('should replace the string component with a function result at the right location', () => {
      let content = "chris was here";
      let subject = "";
      let travResult = { destination: { meta: { range: [6, 9] } } };
      let fn = () => "will be";
      let params = new ParamsModel();
      let result = p["applyTransform"](content, subject, travResult, fn, params);
      expect(result).to.equal("chris \"will be\" here");
    });
    it('should call remove when type remove', () => {
      let removeStub = sinon.stub(), getValStub = sinon.stub();
      p["getTransformValue"] = getValStub;
      p["transform_remove"] = removeStub;
      let content = "one", subject = "two", travResult = { destination: { meta: { range: [6, 9] } } }, val = "three", params = new ParamsModel();
      params.action = "remove";

      p["applyTransform"](content, subject, travResult, val, params);

      sinon.assert.calledWith(removeStub, content, travResult);
    });
  });

  describe('#transform_remove', () => {
    it('should remove an array element', () => {
      let content = '{ "one": [1, 2, 3] }';
      let metajson = JSONParser.parse(content);
      let travResult = p["traverse"](metajson, "$.one[1]");
      let result = p["transform_remove"](content, travResult);

      expect(result).to.deep.equal('{ "one": [1, 3] }');
    });
    it('should remove first array element', () => {
      let content = '{ "one": [1, 2, 3] }';
      let metajson = JSONParser.parse(content);
      let travResult = p["traverse"](metajson, "$.one[0]");
      let result = p["transform_remove"](content, travResult);

      expect(result).to.deep.equal('{ "one": [2, 3] }');
    });
    it('should remove last array element', () => {
      let content = '{ "one": [1, 2, 3] }';
      let metajson = JSONParser.parse(content);
      let travResult = p["traverse"](metajson, "$.one[2]");
      let result = p["transform_remove"](content, travResult);

      expect(result).to.deep.equal('{ "one": [1, 2] }');
    });
    it('should remove an object member pair', () => {
      let content = '{ "one":  { "a": "b", "c": "d", "e": "f" } }';
      let metajson = JSONParser.parse(content);
      let travResult = p["traverse"](metajson, "$.one.c");
      let result = p["transform_remove"](content, travResult);

      expect(result).to.deep.equal('{ "one":  { "a": "b", "e": "f" } }');
    });
    it('should remove first object member pair', () => {
      let content = '{ "one":  { "a": "b", "c": "d", "e": "f" } }';
      let metajson = JSONParser.parse(content);
      let travResult = p["traverse"](metajson, "$.one.a");
      let result = p["transform_remove"](content, travResult);

      expect(result).to.deep.equal('{ "one":  { "c": "d", "e": "f" } }');
    });
    it('should remove last object member pair', () => {
      let content = '{ "one":  { "a": "b", "c": "d", "e": "f" } }';
      let metajson = JSONParser.parse(content);
      let travResult = p["traverse"](metajson, "$.one.e");
      let result = p["transform_remove"](content, travResult);

      expect(result).to.deep.equal('{ "one":  { "a": "b", "c": "d" } }');
    });
  });

  describe('#getTransformValue', () => {
    it('should call the replace function with the needed parameters', () => {
      let content = "chris was here";
      let subject = "";
      let travResult = { destination: { meta: { range: [6, 9] } } };
      let fn = sinon.stub();
      fn.returns("would be");
      let params = new ParamsModel();
      let result = p["applyTransform"](content, subject, travResult, fn, params);
      expect(result).to.equal("chris \"would be\" here");
      sinon.assert.calledWith(fn, subject, travResult);
    });
  });
});
