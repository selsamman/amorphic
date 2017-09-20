'use strict';

let unitTestConfig = require('./unitTestConfig');  // TODO: This seems like the wrong way to go about this.

// Passed the main index export.  Will bind the decorators to either Persistor or Semotus
function bindDecorators (objectTemplate) {

    // TODO: In what situation would objectTemplate be null and why is it acceptable just to use this as a replacement?
    objectTemplate = objectTemplate || this;

    this.Amorphic = objectTemplate;
    this.amorphicStatic = objectTemplate;

    /**
     * Purpose unknown
     *
     * @param {unknown} target unknown
     * @param {unknown} props unknown
     *
     * @returns {unknown} unknown.
     */
    this.supertypeClass = function supertypeClass(target, props) {
        return objectTemplate.supertypeClass(target, props, objectTemplate);
    };

    /**
     * Purpose unknown
     *
     * @returns {unknown} unknown.
     */
    this.Supertype = function Supertype() {
        return objectTemplate.Supertype.call(this, objectTemplate);
    };
    this.Supertype.prototype = require('supertype').Supertype.prototype;

    /**
     *  Purpose unknown
     *
     * @param {unknown} props unknown
     *
     * @returns {unknown} unknown.
     */
    this.property = function property(props) {
        return objectTemplate.property(props, objectTemplate);
    };

    /**
     * Purpose unknown
     *
     * @param {unknown} defineProperty unknown
     *
     * @returns {unknown} unknown.
     */
    this.remote = function remote(defineProperty) {
        return objectTemplate.remote(defineProperty, objectTemplate);
    };

    /**
     * Purpose unknown
     *
     * @returns {unknown} unknown.
     */
    this.Amorphic.create = function create() {
        objectTemplate.connect = unitTestConfig.startup;

        return objectTemplate;
    };

    this.Amorphic.getInstance = function getInstance() {
        return objectTemplate;
    };
}

module.exports = {
    bindDecorators: bindDecorators
};
