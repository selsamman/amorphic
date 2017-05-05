'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) {
            d.__proto__ = b;
        }) ||
        function (d, b) {
            for (var p in b) {
                if (b.hasOwnProperty(p)) {
                    d[p] = b[p];
                }
            }
        };
    return function (d, b) {
        extendStatics(d, b);
        function __() {
            this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, '__esModule', { value: true });
var AmorphicSession = (function () {
    function AmorphicSession() {
    }
    AmorphicSession.prototype.withoutChangeTracking = function (callback) { };

    return AmorphicSession;
}());
exports.AmorphicSession = AmorphicSession;
function Remoteable(Base) {
    return (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.amorphicate = function (obj) { };
        return class_1;
    }(Base));
}
exports.Remoteable = Remoteable;
