module.exports.controller = function (objectTemplate, uses)
{
	var BaseController = uses('./baseController.js', "BaseController");
	var World = uses('./world.js', "World");

    var Controller = BaseController.extend("Controller",
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
}

