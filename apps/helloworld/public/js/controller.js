module.exports.controller = function (objectTemplate, uses)
{
	var BaseController = uses('./baseController.js', "BaseController");
	var World = uses('./world.js', "World");
    var WorldStatic = uses('static.js', 'Stuff');

    var Controller = BaseController.extend("Controller",
	{
		worlds:        {type: Array, of: World, value: []},
        posted:        {type: String, value: ""},
        newWorld: {on: "server", body: function ()
        {
            this.worlds.push(new World());
            console.log("Creating a " + WorldStatic)
            return this.meanWhileBackAtTheRanch();
        }},
        meanWhileBackAtTheRanch: {on: "client", body: function () {
            console.log("Creating a " + WorldStatic)
        }},
        processPost: {on: "server", body: function (uri, body) {
            this.posted = body.myfield;
            return {status: 303, headers: {location: uri.replace(/amorphic.*/, '')}};
        }}
    });
}

