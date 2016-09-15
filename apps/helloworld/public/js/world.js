module.exports.world = function (objectTemplate, uses)
{
	var Foo = uses('Foo.js');
	var World = objectTemplate.create("World", {
		createdAt: 	{type: Date, rule: "datetime"},
		foo:		{type: Foo},
		init: function () {
			this.createdAt = new Date();
			this.foo = new Foo();
		}
	});
}

