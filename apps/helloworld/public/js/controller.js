module.exports.controller = function (objectTemplate, getTemplate)
{
	var BaseController = getTemplate('./baseController.js').BaseController;
	var World = getTemplate('./world.js').World;

    Controller = BaseController.extend("Controller",
	{
		worlds:        {type: Array, of: World, value: []},

        newWorld: {on: "server", body: function ()
        {
            this.worlds.push(new World());
        }}

    });

    return {Controller: Controller};
}

