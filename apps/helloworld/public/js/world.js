module.exports.world = function (objectTemplate, getTemplate, uses)
{
	uses('foo.js');
	return {
		World: objectTemplate.create("World",{})
	}
}
module.exports.world_mixins = function (objectTemplate, requires, templates) {
	with (templates) {

		World.mixin({
			createdAt: {type: Date, rule: "datetime"},

			init: function () {
                this.createdAt = new Date();
				this.foo = new Foo();
            }
		});

	}
}

