'use strict';

let amorphicOptions = {
    conflictMode: 'soft',       // Whether to abort changes based on the "old value" matching. Either 'soft', 'hard'
    compressSession: false,     // Whether to compress data going to REDIS
    compressXHR: true,          // Whether to compress XHR responses
    sourceMode: 'debug'         // Whether to minify templates.  Values: 'debug', 'prod' (minify)
};
let appContext = {};
let applicationConfig = {};
let applicationPersistorProps = {};
let applicationSource = {};
let applicationSourceMap = {};

/**
 * This function exists to reset AmorphicContext to the default options.
 *  It is only used by our tests.  Once our tests have been updated to properly stub
 *  AmorphicContext out this should be removed.
 */
function reset() {
    if (appContext.connectServer) {
        appContext.connectServer.close();
    }

    appContext.connectServer = undefined;
    applicationConfig = {};
    applicationSource = {};
    applicationSourceMap = {};
    applicationPersistorProps = {};

    amorphicOptions = {
        conflictMode: 'soft',
        compressSession: false,
        compressXHR: true,
        sourceMode: 'debug'
    };
}

module.exports = {
    amorphicOptions: amorphicOptions,
    appContext: appContext,
    applicationConfig: applicationConfig,
    applicationPersistorProps: applicationPersistorProps,
    applicationSource: applicationSource,
    applicationSourceMap: applicationSourceMap,
    reset: reset
};
