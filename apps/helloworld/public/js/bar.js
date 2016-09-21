module.exports.bar = function (objectTemplate, uses)
{
    var Foo = uses('foo.js', 'Foo');
    var BarExtended = uses('foo.js', 'BarExtended');
    var Bar = objectTemplate.create("Bar", {});
    var FooExtended = Foo.extend("FooExtended", {});
    var FooExtendedExtended = FooExtended.extend('FooExtendedExtended', {});

    Bar.mixin({
        foo: {type: Foo},
        fooExtended: {type: FooExtended},
        fooExtendedExtended: {type: FooExtendedExtended},
        myName: {type: String, value: 'Bar'},
        init: function () { },
    })
    FooExtended.mixin({
        myExtendedName: {type: String, value: "FooExtended"}
    });
    FooExtendedExtended.mixin({
        myExtendedExtendedName: {type: String, value: "FooExtendedExtended"}
    });
}
