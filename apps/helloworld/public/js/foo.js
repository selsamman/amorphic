// foo.js
module.exports.foo = function (objectTemplate, getTemplate, uses)
{
    uses("bar.js");
    return {
        Foo: objectTemplate.create("Foo", {})
    }
}
module.exports.foo_mixins = function (objectTemplate, requires, templates)
{
    with (templates) {

        Foo.mixin({
            init: function () {
                this.bar = new Bar();
            },
            count: {type: Number},
            bar: {type: Bar}
        });

    }
}
