/* Copyright 2012-2013 Sam Elsamman
 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
"use strict";

// Node Modules
var Q = require('q');
var Semotus = require('semotus');

// Local Modules
var getTemplates = require('./lib/getTemplates').getTemplates;
var listen = require('./lib/listen').listen;

// Module Global Variables
var AmorphicContext = require('./lib/AmorphicContext');

Semotus.maxCallTime = 60 * 1000; // Max time for call interlock

// TODO: Remove this - this is just to set the default config options
/**
 * Purpose unknown
 *
 * @returns {unknown} unknown
 */
function reset() {
    AmorphicContext.reset();
    return Q(true);
}

reset();

function localGetTemplates(objectTemplate, appPath, templates, config, path, sourceOnly, detailedInfo) {
    return getTemplates(objectTemplate, appPath, templates, config, path, sourceOnly, detailedInfo,
        AmorphicContext.amorphicOptions, AmorphicContext.applicationSource, AmorphicContext.applicationSourceMap,
        AmorphicContext.applicationPersistorProps);
}

function localListen(appDirectory, sessionStore, preSessionInject, postSessionInject, sendToLogFunction) {
    listen(appDirectory, sessionStore, preSessionInject, postSessionInject, sendToLogFunction);
}

module.exports = {
    getTemplates: localGetTemplates,
    listen: localListen,
    reset: reset
};
