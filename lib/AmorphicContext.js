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
let applicationTSController = {};

module.exports = {
    amorphicOptions: amorphicOptions,
    appContext: appContext,
    applicationConfig: applicationConfig,
    applicationPersistorProps: applicationPersistorProps,
    applicationSource: applicationSource,
    applicationSourceMap: applicationSourceMap,
    applicationTSController: applicationTSController
};
