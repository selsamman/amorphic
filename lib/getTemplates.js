'use strict';

// Internal modules
let AmorphicContext = require('./AmorphicContext');
let UglifyJS = require('uglify-js');
let logMessage = require('./utils/logger').logMessage;
let getTemplate = require('./getTemplate').getTemplate;
let recordStatics = require('./getTemplate').recordStatics;
let flattenTemplates = require('./flattenTemplates');
let UsesV2ReturnPass1 = require('./UsesV2ReturnPass1');

// Npm modules
let path = require('path');

/**
 * Purpose unknown
 *
 * @param {unknown} persistObjectTemplate unknown
 * @param {String} appPath - The path for app files.
 * @param {String[]} templates - List of root templates to retrieve. 'Root' since all referenced templates are
 * also retrieved.
 * @param {unknown} config unknown
 * @param {String} appName - The app name.
 *
 * @returns {unknown} unknown
 */
function getTemplates(persistObjectTemplate, appPath, templates, config, appName) {

    let amorphicOptions = AmorphicContext.amorphicOptions;
    let applicationSource = AmorphicContext.applicationSource;
    let applicationSourceMap = AmorphicContext.applicationSourceMap;
    let applicationPersistorProps = AmorphicContext.applicationPersistorProps;
    let mixinGraph = {};

    let requiredTemplates = {};
    let referencedTemplates = {};
    let fileInitializers = {};
    let filePaths = {};
    let mixins = [];
    let ignoringClient = false;
    let filesNeeded = {};

    let currentContext = {
        pass: 1
    };

    let applicationSourceCandidate = {};
    let ast = null;
    let deferredExtends = [];
    let currentModule;
    let messageToLog;
    let templateMode;

    if (config.appConfig) {
        templateMode = config.appConfig.templateMode;
    }

    persistObjectTemplate.__statics__ = persistObjectTemplate.__statics__ || {};
    persistObjectTemplate.__initialized__ = false;

    UsesV2ReturnPass1.prototype.extend = v2Extend;
    UsesV2ReturnPass1.prototype.doExtend = v2DoExtend;

    if (amorphicOptions.sourceMode === 'debug') {
        applicationSource[appName] = '';
    }

    // Process each template passed in (except for unit tests there generally is just the controller)
    for (let ix = 0; ix < templates.length; ++ix) {
        getTemplate(templates[ix], {}, templateMode === 'auto',
            ignoringClient,
            requiredTemplates,
            referencedTemplates,
            mixinGraph,
            filesNeeded,
            appPath,
            appName,
            persistObjectTemplate,
            config,
            mixins,
            fileInitializers,
            filePaths,
            applicationSourceCandidate,
            currentContext,
            UsesV2ReturnPass1
        );
    }

    // Extended classes can't be processed until now when we know we have all the base classes defined
    // So we do the extends for them now after recording all info in the first pass
    let futureTemplates = {};

    for (let ixc = 0; ixc < deferredExtends.length; ++ixc) {
        futureTemplates[deferredExtends[ixc].extendedName] = deferredExtends[ixc];
    }

    for (let ixb = 0; ixb < deferredExtends.length; ++ixb) {
        deferredExtends[ixb].doExtend(futureTemplates);
    }

    // Process V1 style mixins
    for (let ixa = 0; ixa < mixins.length; ++ixa) {
        if (mixins[ixa]) {
            (mixins[ixa])(persistObjectTemplate, requiredTemplates, flattenTemplates(requiredTemplates));
        }
    }

    currentContext.pass = 2;

    // Process V2 pass 2
    if (templateMode === 'auto') {
        for (let fileKey in fileInitializers) {
            let oldCreate = persistObjectTemplate.create;
            persistObjectTemplate.create = v2Create;
            recordStatics(persistObjectTemplate, requiredTemplates, fileInitializers[fileKey](persistObjectTemplate, usesV2Pass2), fileKey);
            persistObjectTemplate.create = oldCreate;
        }
    }

    // Now that all properties are in place we can do the template level mixins
    processDeferredMixins();

    // Add the sources to either a structure to be uglified or to an object for including one at a time
    for (let appSource in applicationSourceCandidate) {
        let templateNeededOnClient = false;

        for (let template in requiredTemplates[appSource]) {
            if (isTemplateOnClient(requiredTemplates[appSource][template])) {
                templateNeededOnClient = true;
            }
        }

        if (filesNeeded[appSource] && templateNeededOnClient) {
            if (amorphicOptions.sourceMode === 'debug') {
                applicationSource[appName] += applicationSourceCandidate[appSource][0];
            }
            else {
                addUglifiedSource(applicationSourceCandidate[appSource][0], applicationSourceCandidate[appSource][1]);
            }
        }
        else {
            for (let templatea in requiredTemplates[appSource]) {
                if (requiredTemplates[appSource][templatea]) {
                    requiredTemplates[appSource][templatea].__toClient__ = false;
                }
                else {
                    logMessage(templatea + ' not found in requiredTemplates for ' + appSource);
                }
            }
        }
    }

    // Handle NPM includes (amorphic-userman module, etc.)
    if (config && config.appConfig && config.appConfig.modules) {
        for (let moduleKey in config.appConfig.modules) {
            currentModule = config.appConfig.modules[moduleKey];

            if (!currentModule.require) {
                messageToLog = 'Module: ' + moduleKey + ' - missing a "require" property';
                logMessage(messageToLog);
            }
            else if (typeof(require(currentModule.require)[moduleKey + '_mixins']) !== 'function') {
                messageToLog = currentModule.require + ' must export a '
                    + moduleKey + '_mixins property which is an initialization function';
                logMessage(messageToLog);
            }
            else {
                addModuleToSource(moduleKey, currentModule);
            }
        }
    }

    let walker;  // This need to be defined up here because it's referenced in the before function

    // Because of the two pass nature, requiredTemplates are not update for extends which are only done between passes
    // Record source and source map
    if (ast && !applicationSource[appName] && !config.appConfig.isDaemon) {
        ast.figure_out_scope();

        /*eslint-disable new-cap, camelcase */
        let compressor = UglifyJS.Compressor();
        ast = ast.transform(compressor);

        walker = new UglifyJS.TreeTransformer(before);
        ast = ast.transform(walker);

        let sourceMap = UglifyJS.SourceMap();
        let stream = UglifyJS.OutputStream({source_map: sourceMap});
        /*eslint-enable new-cap, camelcase */

        ast.print(stream);
        applicationSource[appName] = stream.toString();
        applicationSourceMap[appName] = sourceMap.toString();
    }

    persistObjectTemplate.performInjections();

    if (!applicationPersistorProps[appName]) {
        applicationPersistorProps[appName]= {};
        if (persistObjectTemplate.getPersistorProps) {
            applicationPersistorProps[appName] = persistObjectTemplate.getPersistorProps();
        }
    }

    return requiredTemplates;

    function before(node, descend) {
        if (node instanceof UglifyJS.AST_ObjectProperty && node.key === 'body' && findOnServer(walker.parent())) {
            let emptyFunction = node.clone();

            emptyFunction.value.variables = {};
            emptyFunction.value.body = [];
            emptyFunction.value.argNames = [];
            /*eslint-disable new-cap */
            emptyFunction.value.start = UglifyJS.AST_Token({type: 'string', value: '{'});
            emptyFunction.value.end = UglifyJS.AST_Token({type: 'string', value: '}'});
            /*eslint-enable new-cap */

            return emptyFunction;
        }

        node = node.clone();
        descend(node, this);

        return node;
    }

    function findOnServer(node) {
        let ret = null;

        if (node.properties) {
            node.properties.forEach(isOnServer);
        }

        return ret;

        function isOnServer(node) {
            if (node.key === 'on' && node.value && node.value.value === 'server') {
                ret = node;
            }
        }
    }


    function addModuleToSource(moduleKey, module) {
        let moduleExports = require(module.require);
        let moduleSource;

        moduleExports[moduleKey + '_mixins'](persistObjectTemplate, requiredTemplates, module, config.appConfig.nconf);

        if (typeof(appName) !== 'undefined') {
            if (amorphicOptions.sourceMode === 'debug') {
                moduleSource = "document.write(\"<script src='/modules/"
                    + module.require
                    + '/index.js?ver='
                    + config.appVersion
                    + "'></script>\");\n\n";

                applicationSource[appName] += moduleSource;
            }
            else {
                addUglifiedSource('module.exports.' + moduleKey + '_mixins = ' + moduleExports[moduleKey + '_mixins'] +
                    '\n\n', '/modules/' + module.require + '/index.js?ver=' + config.appVersion);
            }
        }
    }

    function addUglifiedSource(data, file) {
        if (!applicationSource[appName]) {
            ast = UglifyJS.parse(data, { filename: file, toplevel: ast });
        }
    }

    function v2Extend(name) {
        this.extendedName = name;
        deferredExtends.push(this);

        return new UsesV2ReturnPass1(name, this.prop);
    }

    function v2Create(name, props) {
        name = name.name || name;
        persistObjectTemplate.__dictionary__[name].mixin(props);

        return persistObjectTemplate.__dictionary__[name];
    }

    function v2DoExtend(futureTemplates) {
        let errorMsg;

        if (!persistObjectTemplate.__dictionary__[this.baseName]) {
            if (futureTemplates[this.baseName]) {
                futureTemplates[this.baseName].doExtend(futureTemplates);
            }

            if (!persistObjectTemplate.__dictionary__[this.baseName]) {
                errorMsg = 'Attempt to extend '
                    + this.baseName
                    + ' which was never defined; extendedName='
                    + this.extendedName;

                throw Error(errorMsg);
            }
        }

        if (!persistObjectTemplate.__dictionary__[this.extendedName]) {
            let template = persistObjectTemplate.__dictionary__[this.baseName].extend(this.extendedName, {});
            requireTemplate(this.prop, template, requiredTemplates);
        }
    }

    function usesV2Pass2(file, templateName) {
        templateName = templateName || path.basename(file, '.js');
        return persistObjectTemplate.__dictionary__[templateName] || persistObjectTemplate.__statics__[templateName];
    }

    function processDeferredMixins() {

        // Go through each template that needs a mixin
        for (var rootMixin in mixinGraph) {
            processRootMixin(mixinGraph[rootMixin], rootMixin);
        }

        function processRootMixin(rootMixin, rootMixinTemplateName) {

            // Go through each of the templates that needs to be mixed in
            for (var childMixin in rootMixin) {
                processChildMixin(childMixin);
            }

            function processChildMixin(childMixinTemplateName) {

                // that template that needs to be mixed in also needs mixins, process them first
                if (mixinGraph[childMixinTemplateName]) {
                    processRootMixin(mixinGraph[childMixinTemplateName], childMixinTemplateName);
                    mixinGraph[childMixinTemplateName] = {};  // Make sure we don't process twice
                }
                // Now we can safely do the mixin
                persistObjectTemplate.mixin(persistObjectTemplate.__dictionary__[rootMixinTemplateName],
                    persistObjectTemplate.__dictionary__[childMixinTemplateName]);
            }
        }
    }


}

function requireTemplate(prop, template, requiredTemplates) {
    requiredTemplates[prop] = requiredTemplates[prop] || {};
    requiredTemplates[prop][template.__name__] = template;
}

function isTemplateOnClient(template) {
    return template.__toClient__ || typeof(template.__toClient__) === 'undefined';
}


module.exports = {
    getTemplates: getTemplates
};
