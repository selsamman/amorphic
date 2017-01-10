'use strict';

var amorphicOptions = {};
var appContext = {};
var applicationConfig = {};
var applicationPersistorProps = {};
var applicationSource = {};
var applicationSourceMap = {};

function reset() {
    if (appContext.connection) {
        appContext.connection.close();
    }

    appContext.connection = undefined;
    applicationConfig = {};
    applicationSource = {};
    applicationSourceMap = {};
    applicationPersistorProps = {};

    amorphicOptions = {
        conflictMode: 'soft',       // Whether to abort changes based on the "old value" matching.
                                        // Either 'soft', 'hard'
        compressSession: false,     // Whether to compress data going to REDIS
        compressXHR: true,          // Whether to compress XHR responses
        sourceMode: 'debug'         // Whether to minify templates.  Values: 'debug', 'prod' (minify)
    };
}

reset();

module.exports = {
    amorphicOptions: amorphicOptions,
    appContext: appContext,
    applicationConfig: applicationConfig,
    applicationPersistorProps: applicationPersistorProps,
    applicationSource: applicationSource,
    applicationSourceMap: applicationSourceMap,
    reset: reset
};
