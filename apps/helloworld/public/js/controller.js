module.exports.controller = function (objectTemplate, getTemplate)
{
	var BaseController = getTemplate('./baseController.js').BaseController;
	var World = getTemplate('./world.js').World;
    if (typeof(require) != 'undefined') {
        var fs = require('fs');
        var Q = require('q');
    }

    Controller = BaseController.extend("Controller",
	{
		worlds:        {type: Array, of: World, value: []},
        posted:        {type: String, value: ""},
        newWorld: {on: "server", body: function ()
        {
            this.worlds.push(new World());
        }},
        processPost: {on: "server", body: function (uri, body) {
            this.posted = body.myfield;
            return {status: 303, headers: {location: uri.replace(/amorphic.*/, '')}};
        }}
    });

    return {Controller: Controller};
}

