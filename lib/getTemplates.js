var fs = require('fs');
var UglifyJS = require('uglify-js');
/**
 * Purpose unknown
 *
 * @param {unknown} objectTemplate unknown
 * @param {unknown} appPath unknown
 * @param {unknown} templates unknown
 * @param {unknown} config unknown
 * @param {unknown} path unknown
 * @param {unknown} _sourceOnly unknown
 * @param {unknown} detailedInfo unknown
 * @param {unknown} amorphicOptions unknown
 * @param {unknown} applicationSource unknown
 * @param {unknown} applicationSourceMap unknown
 * @param {unknown} applicationPersistorProps unknown
 *
 * @returns {unknown} unknown
 */
function getTemplates(objectTemplate, appPath, templates, config, path, _sourceOnly, detailedInfo,
  amorphicOptions, applicationSource, applicationSourceMap, applicationPersistorProps) {

    var requires = {};
    var ref = {};
    var mixins = [];
    var all_require_results = {};
    var all_file_paths = {};
    var ignoringClient = false;
    var filesNeeded = {};
    var currentContext = {pass: 1};

    objectTemplate.__statics__ = objectTemplate.__statics__ || {}; //TODO: Are we always falling back to an empty object?

    var applicationSourceCandidate = {};
    var ast = null;

    objectTemplate.__initialized__ = false;

    var deferredExtends = [];

    function addTemplateToRequires(prop, template) {
        requires[prop] = requires[prop] || {};
        requires[prop][template.__name__] = template;
    }

    // An object for creating request to extend classes to be done at thend of V2 pass1
    function usesV2ReturnPass1(base, prop) {
        this.baseName = base;
        this.prop = prop;
    }

    usesV2ReturnPass1.prototype.mixin = function l() {};

    usesV2ReturnPass1.prototype.extend = function m(name) {
        this.extendedName = name;
        deferredExtends.push(this);

        return new usesV2ReturnPass1(name, this.prop);
    };

    usesV2ReturnPass1.prototype.doExtend = function n(futureTemplates) {
        if (!objectTemplate.__dictionary__[this.baseName]) {
            if (futureTemplates[this.baseName]) {
                futureTemplates[this.baseName].doExtend(futureTemplates);
            }

            if (!objectTemplate.__dictionary__[this.baseName]) {
                throw Error('Attempt to extend ' + this.baseName + ' which was never defined; extendedName=' + this.extendedName);
            }
        }

        if (!objectTemplate.__dictionary__[this.extendedName]) {
            var template = objectTemplate.__dictionary__[this.baseName].extend(this.extendedName, {});
            addTemplateToRequires(this.prop, template);
        }
    };

    if (amorphicOptions.sourceMode == 'debug') {
        applicationSource[path] = '';
    }

    function getTemplate(file, options, uses) {
        var previousIgnoringClient = ignoringClient;

        if (options && (options.client === false)) {
            ignoringClient = true;
        }

        file.match(/([0-9A-Za-z_]*)\.js/);

        var prop = RegExp.$1;

        if (!ignoringClient) {
            filesNeeded[prop] = true;
        }

        if (requires[prop]) {
            ignoringClient = previousIgnoringClient;

            return requires[prop];
        }

        if (ref[prop]) {
            if (uses) {
                return;
            }
            else {
                throw  new Error('circular reference on ' + file);
            }
        }

        ref[prop] = true;

        // 1. If the file is to be 'required' from a specific app, use
        // that app, otherwise
        // 2. look for the file under the current app,
        // 3. otherwise look under common
        var clientPath, require_results;
        var requirePath;

        if (options && options.app) {
            clientPath = options.app;

            var daemonPath =  config.commonPath + '/../../' + clientPath + '/js/' + file;
            var interactivePath = config.commonPath + '/../../' + clientPath + '/public/js/' + file;

            if (fs.existsSync(daemonPath)) {
                require_results = require(daemonPath);
                requirePath = daemonPath;
            }
            else {
                require_results = require(interactivePath);
                requirePath = interactivePath;
            }
        }
        else if (fs.existsSync(appPath + file)) {
            clientPath = path;
            require_results = require(appPath + file);
            requirePath = appPath + file;
        }
        else {
            clientPath = 'common';
            require_results = require(config.commonPath + file);
            requirePath = config.commonPath + file;
        }

        // There is a legacy mode where recursive templates are handled with a two-phase two-function call
        // in the templates which return an object with an xxx prop and an xxx_mixin prop named the same as the file
        // In the current mode (V2), a function is returned which is called in two passes.  On the first pass
        // an ObjectTemplate subclass is passed in that only creates templates but does not process their properties
        // and on a second pass converts all create calls to mixins and returns the actual templates when referenced
        // via the getTemplate second parameter
        var objectTemplateInitialize = require_results['objectTemplateInitialize'];
        var initializer = (require_results[prop]);
        var mixins_initializer = (require_results[prop + '_mixins']);

        if (typeof(initializer) != 'function') {
            throw new Error(prop + ' not exported in ' + appPath + file);
        }

        // Call application code that can poke properties into objecTemplate
        if (!objectTemplate.__initialized__ && objectTemplateInitialize) {
            objectTemplateInitialize(objectTemplate);
        }

        objectTemplate.__initialized__ = true;

        if (config.appConfig && config.appConfig.templateMode == 'auto') {
            (function o() {
                var closureProp = prop;

                // Update objectTemplate create proxy such that it will create the template with
                // an extend proxy that on the second pass may find that the extend was done by deferred
                // processing and so the extend really just needs to mixin the properties
                var oldCreate = objectTemplate.create;

                objectTemplate.create = function p(name) {
                    var template = oldCreate.call(objectTemplate, name, {});
                    var originalExtend = template.extend;

                    template.extend = function q(name, props)  {
                        var template = objectTemplate.__dictionary__[name];

                        if (template) {
                            template.mixin(props);
                        }
                        else {
                            template = originalExtend.call(this, name, props);

                            addTemplateToRequires(currentContext.moduleName, template);
                        }

                        return template;
                    };

                    var originalMixin = template.mixin;

                    template.mixin = function r() {
                        if (currentContext.pass == 2) {
                            originalMixin.apply(template, arguments);
                        }
                    };

                    addTemplateToRequires(currentContext.moduleName, template);

                    return template;
                };

                var previousToClient = objectTemplate.__toClient__;
                objectTemplate.__toClient__ = !ignoringClient;
                currentContext.moduleName = prop;

                // Call constructor function with a subclass of objectTemplate and a special uses that wil
                // Return a stub that will simply setup deferred processing for extends
                var initializerReturnValues = require_results[prop](objectTemplate,
                    function usesV2Pass1(file, templateName, options) {
                        templateName = templateName || file.replace(/\.js$/, '').replace(/.*?[\/\\](\w)$/, '$1');
                        var moduleName = currentContext.moduleName;

                        getTemplate(file, options, true);
                        currentContext.moduleName = moduleName;

                        var staticTemplate = objectTemplate.__statics__[templateName];

                        return staticTemplate || new usesV2ReturnPass1(templateName, closureProp);
                    }
                );

                objectTemplate.create = oldCreate;
                all_require_results[prop] = require_results[prop];
                objectTemplate.__toClient__ = previousToClient;

                recordStatics(initializerReturnValues);
            })();
        }
        else {
            // Call the initialize function in the template
            var previousToClient = objectTemplate.__toClient__;

            objectTemplate.__toClient__ = !ignoringClient;

            var includeMixins = !requires[prop];
            var templates = requires[prop] || initializer(objectTemplate, getTemplate, usesV1);

            objectTemplate.__toClient__ = previousToClient;
            requires[prop] = templates;

            if (Object.getOwnPropertyNames(templates).length == 0) {
                objectTemplate.__statics__[prop] = templates;
            }
            else {
                for (var returnVariable in templates) {
                    if (!objectTemplate.__dictionary__[returnVariable]) {
                        objectTemplate.__statics__[returnVariable] = templates[returnVariable];
                    }
                }
            }

            if (mixins_initializer && includeMixins) {
                mixins.push(mixins_initializer);
            }

            all_require_results[prop] = initializer;

            if (mixins_initializer) {
                all_require_results[prop + '_mixins'] = mixins_initializer;
            }
        }

        all_file_paths[prop] = requirePath;

        if (typeof(path) != 'undefined') {
            if (amorphicOptions.sourceMode == 'debug') {
                applicationSourceCandidate[prop] = ["document.write(\"<script src='/" + clientPath + '/js/' + file + '?ver=' + config.appVersion + "'></script>\");\n\n"];
            }
            else {
                if (mixins_initializer) {
                    if (objectTemplateInitialize) {
                        applicationSourceCandidate[prop] = ['module.exports.' + prop + ' = ' + require_results[prop] + '\n\n' +
                        'module.exports.objectTemplateInitialize = ' + objectTemplateInitialize + '\n\n' + 'module.exports.' + prop + '_mixins = ' + mixins_initializer + '\n\n',
                            '/' + clientPath + '/js/' + file + '?ver=' + config.appVersion];
                    }
                    else {
                        applicationSourceCandidate[prop] = ['module.exports.' + prop + ' = ' + require_results[prop] + '\n\n' +
                        'module.exports.' + prop + '_mixins = ' + mixins_initializer + '\n\n',
                            '/' + clientPath + '/js/' + file + '?ver=' + config.appVersion];
                    }
                }
                else {
                    if (objectTemplateInitialize) {
                        applicationSourceCandidate[prop] = ['module.exports.' + prop + ' = ' + require_results[prop] + '\n\n' +
                        'module.exports.objectTemplateInitialize = ' + objectTemplateInitialize + '\n\n',
                            '/' + clientPath + '/js/' + file + '?ver=' + config.appVersion];
                    }
                    else {
                        applicationSourceCandidate[prop] = ['module.exports.' + prop + ' = ' + require_results[prop] + '\n\n',
                            '/' + clientPath + '/js/' + file + '?ver=' + config.appVersion];
                    }
                }
            }
        }

        ignoringClient = previousIgnoringClient;

        return templates;

        function usesV1(file, options) {
            getTemplate(file, options, true);
        }
    }

    // Process each template passed in (except for unit tests there generally is just the controller)
    for (var ix = 0; ix < templates.length; ++ix) {
        getTemplate(templates[ix]);
    }

    // Extended classes can't be processed until now when we know we have all the base classes defined
    // So we do the extends for them now after recording all info in the first pass
    var futureTemplates = {};

    for (var ixc = 0; ixc < deferredExtends.length; ++ixc) {
        futureTemplates[deferredExtends[ixc].extendedName] = deferredExtends[ixc];
    }

    for (var ixb = 0; ixb < deferredExtends.length; ++ixb) {
        deferredExtends[ixb].doExtend(futureTemplates);
    }

    // Process V1 style mixins
    for (var ixa = 0; ixa < mixins.length; ++ixa) {
        if (mixins[ixa]) {
            (mixins[ixa])(objectTemplate, requires, flatten(requires));
        }
    }

    currentContext.pass = 2;

    // Process V2 pass 2
    if (config.appConfig && config.appConfig.templateMode == 'auto') {
        for (var prop in all_require_results) {
            var oldCreate = objectTemplate.create;

            objectTemplate.create = function t(name, props) {
                name = name.name || name;
                objectTemplate.__dictionary__[name].mixin(props);

                return objectTemplate.__dictionary__[name];
            };

            recordStatics(all_require_results[prop](objectTemplate, usesV2Pass2));
            objectTemplate.create = oldCreate;
        }
    }


    // Add the sources to either a structure to be uglified or to an object for including one at a time
    for (var propa in applicationSourceCandidate) {
        var templateNeededOnClient = false;

        for (var template in requires[propa]) {
            if (requires[propa][template].__toClient__ || typeof(requires[propa][template].__toClient__) == 'undefined') {
                templateNeededOnClient = true;
            }
        }

        if (filesNeeded[propa] && templateNeededOnClient) {
            if (amorphicOptions.sourceMode == 'debug') {
                applicationSource[path] += applicationSourceCandidate[propa][0];
            }
            else {
                addUglifiedSource(applicationSourceCandidate[propa][0], applicationSourceCandidate[propa][1]);
            }
        }
        else {
            for (var templatea in requires[propa]) {
                if (requires[propa][templatea]) {
                    requires[propa][templatea].__toClient__ = false;
                }
                else {
                    logMessage(templatea + ' not found in requires for ' + propa);
                }
            }
        }
    }

    // Handle NPM includes
    if (config && config.appConfig && config.appConfig.modules) {
        for (var mixin in config.appConfig.modules) {
            if (!config.appConfig.modules[mixin].require) {
                logMessage('Module ' + mixin + ' missing a requires property ');
            }
            else if (typeof(require(config.appConfig.modules[mixin].require)[mixin + '_mixins']) != 'function') {
                logMessage(config.appConfig.modules[mixin].require + ' must export a ' + mixin + '_mixins property which is an initialization function');
            }
            else {
                var requireName = config.appConfig.modules[mixin].require;
                var results = require(requireName);

                results[mixin + '_mixins'](objectTemplate, requires, config.appConfig.modules[mixin], config.appConfig.nconf);

                if (typeof(path) != 'undefined') {
                    if (amorphicOptions.sourceMode == 'debug') {
                        applicationSource[path] += "document.write(\"<script src='/modules/" + requireName + '/index.js?ver=' + config.appVersion + "'></script>\");\n\n";
                    }
                    else {
                        addUglifiedSource('module.exports.' + mixin + '_mixins = ' + results[mixin + '_mixins'] + '\n\n', '/modules/' + requireName + '/index.js?ver=' + config.appVersion);
                    }
                }
            }
        }
    }

    // Because of the two pass nature, requires templates are not update for extends which are only done between passes
    // Record source and source map
    if (ast && !applicationSource[path] && !config.appConfig.isDaemon) {
        ast.figure_out_scope();

        var compressor = UglifyJS.Compressor();
        ast = ast.transform(compressor);

        var walker = new UglifyJS.TreeTransformer(before);
        ast = ast.transform(walker);

        var source_map = UglifyJS.SourceMap();
        var stream = UglifyJS.OutputStream({source_map: source_map});

        ast.print(stream);
        applicationSource[path] = stream.toString();
        applicationSourceMap[path] = source_map.toString();
    }


    objectTemplate.performInjections();

    if (applicationSource[path]) {
        applicationPersistorProps[path] = {};

        if (objectTemplate.getPersistorProps) {
            applicationPersistorProps[path] = objectTemplate.getPersistorProps();
        }
    }

    if (detailedInfo) {
        detailedInfo.moduleExports = requires;
        detailedInfo.initializers = all_require_results;
        detailedInfo.filePaths = all_file_paths;
    }

    return requires;

    function usesV2Pass2(file, templateName) {
        templateName = templateName || file.replace(/\.js$/, '').replace(/.*?[\/\\](\w)$/, '$1');

        return objectTemplate.__dictionary__[templateName] || objectTemplate.__statics__[templateName];
    }

    function before(node,  descend) {

        if (node instanceof UglifyJS.AST_ObjectProperty && node.key == 'body' && findOnServer(walker.parent())) {
            var emptyFunction = node.clone();

            emptyFunction.value.variables = {};
            emptyFunction.value.body = [];
            emptyFunction.value.argNames = [];
            emptyFunction.value.start = UglifyJS.AST_Token({type: 'string', value: '{'});
            emptyFunction.value.end = UglifyJS.AST_Token({type: 'string', value: '}'});

            return emptyFunction;
        }

        node = node.clone();
        descend(node, this);

        return node;

        function findOnServer(node) {
            var ret = null;

            if (node.properties) {
                node.properties.forEach(isOnServer);
            }

            return ret;

            function isOnServer(node) {
                if (node.key == 'on' && node.value && node.value.value == 'server') {
                    ret = node;
                }
            }
        }
    }

    function recordStatics(initializerReturnValues) {
        for (var returnVariable in initializerReturnValues) {
            if (!objectTemplate.__dictionary__[returnVariable]) {
                if (!requires[prop]) {
                    requires[prop] = {};
                }

                requires[prop][returnVariable] = initializerReturnValues[returnVariable];
                objectTemplate.__statics__[returnVariable] = initializerReturnValues[returnVariable];
            }
        }
    }

    function addUglifiedSource(data, file) {
        if (!applicationSource[path]) {
            ast = UglifyJS.parse(data, { filename: file, toplevel: ast });
        }
    }

    function flatten(requires) {
        var classes = {};

        for (var f in requires) {
            for (var c in requires[f]) {
                classes[c] = requires[f][c];
            }
        }

        return classes;
    }
}

module.exports = {
    getTemplates: getTemplates
};
