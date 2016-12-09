module.exports.controller = function (objectTemplate, uses) {

    var localObjectTemplate = objectTemplate;
    var BaseController = uses('./baseController.js', "BaseController");
    var MapFromStatic = uses('./static.js', 'map');

    var Controller = BaseController.extend("Controller", {
        prop: {type: Boolean, value: false},
        propWithValuesAndDescriptions: {type: String,
            values: ['value'],
            descriptions: {
                value: 'Description'
            }
        },
        virtualProp: {type: String, isVirtual: true,
            get: function() {
                return "I am virtual";
            }
        },

        serverInit: function() {
            this.prop = true;
            daemonAutoController = this;
        },

        processPost: {on: "server", body: function(uri, body) {
            this.posted = body.myfield;
            return {status: 303, headers: {location: uri.replace(/amorphic.*/, '')}};
        }},

        getMapFromStatic: function() {
            return MapFromStatic;
        },

        getObjectTemplate: function() {
            return localObjectTemplate;
        }
    });
};
