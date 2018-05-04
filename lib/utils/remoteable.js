"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var supertype_1 = require("supertype");
var AmorphicSession = /** @class */ (function (_super) {
    __extends(AmorphicSession, _super);
    function AmorphicSession() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AmorphicSession.prototype.withoutChangeTracking = function (callback) { };
    ;
    AmorphicSession.prototype.expireSession = function () { };
    ;
    return AmorphicSession;
}(supertype_1.SupertypeSession));
exports.AmorphicSession = AmorphicSession;
var amorphicStatic = /** @class */ (function () {
    function amorphicStatic() {
    }
    amorphicStatic.beginDefaultTransaction = function () { };
    amorphicStatic.beginTransaction = function (nodefault) { };
    amorphicStatic.endTransaction = function (persistorTransaction, logger) { };
    amorphicStatic.begin = function (isdefault) { };
    amorphicStatic.end = function (persistorTransaction, logger) { };
    ;
    amorphicStatic.commit = function (options) { };
    ;
    amorphicStatic.createTransientObject = function (callback) { };
    ;
    amorphicStatic.getClasses = function () { };
    ;
    amorphicStatic.syncAllTables = function () { };
    ;
    amorphicStatic.getInstance = function () { };
    ;
    return amorphicStatic;
}());
exports.amorphicStatic = amorphicStatic;
function Remoteable(Base) {
    return /** @class */ (function (_super) {
        __extends(class_1, _super);
        function class_1() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        class_1.prototype.amorphicate = function (obj) { };
        return class_1;
    }(Base));
}
exports.Remoteable = Remoteable;
