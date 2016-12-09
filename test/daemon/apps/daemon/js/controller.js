module.exports.controller = function (objectTemplate, getTemplate) {

    var localObjectTemplate = objectTemplate;
    var Controller = objectTemplate.create("Controller", {
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
            daemonController = this;
        },

        processPost: {on: "server", body: function(uri, body) {
            this.posted = body.myfield;
            return {status: 303, headers: {location: uri.replace(/amorphic.*/, '')}};
        }},

        getObjectTemplate: function() {
            return localObjectTemplate;
        }
    });

    return {
        Controller: Controller
    };
};
