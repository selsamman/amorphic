// bar.js
module.exports.bar = function (objectTemplate, getTemplate, uses)
{
    uses('foo.js');
    return {
        Bar: objectTemplate.create("Bar", {})
    }
}
module.exports.bar_mixins = function (objectTemplate, requires, templates)
{
    with (templates) {
        Bar.mixin({
            init: function () {
                this.foo = new Foo();
            },
            foo: {type: Foo}
        });
    }
}
