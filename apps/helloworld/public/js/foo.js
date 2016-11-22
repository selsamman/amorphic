module.exports.foo = function (objectTemplate, uses)
{
    var Bar = uses('bar.js', 'Bar');
    var FooExtended = uses('bar.js', 'FooExtended');
    var Foo = objectTemplate.create("Foo", {});
    var BarExtended = Bar.extend("BarExtended", {});
    var BarExtendedExtended = BarExtended.extend('BarExtendedExtended', {});

    Foo.mixin({
        bar: {type: Bar},
        barExtended: {type: BarExtended},
        barExtendedExtended: {type: BarExtendedExtended},
        myName: {type: String, value: 'Foo'},
        init: function () {
            this.bar = new Bar();
            this.barExtended = new BarExtended();
            this.barExtendedExtended = new BarExtended();
        },
    })
    BarExtended.mixin({
        myExtendedName: {type: String, value: "BarExtended"}
    });
    BarExtendedExtended.mixin({
        myExtendedExtendedName: {type: String, value: "BarExtendedExtended"}
    });
}
