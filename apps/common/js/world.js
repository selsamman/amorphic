module.exports.world = function (objectTemplate, getTemplate)
{
	var World = objectTemplate.create({

			createdAt: {type: Date, rule: "datetime"},

			init: function () {
                this.createdAt = new Date();
            }
		});

	return {
		World: World
	}

}

