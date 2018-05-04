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
var persistor_1 = require("persistor");
var supertype_1 = require("supertype");
var _1 = require("../");
var amorphic_bindster_1 = require("amorphic-bindster");
var Persistent = /** @class */ (function (_super) {
    __extends(Persistent, _super);
    function Persistent() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Persistent;
}(persistor_1.Persistable(supertype_1.Supertype)));
exports.Persistent = Persistent;
;
var IsomorphicQuery = /** @class */ (function (_super) {
    __extends(IsomorphicQuery, _super);
    function IsomorphicQuery() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return IsomorphicQuery;
}(_1.Remoteable(persistor_1.Persistable(supertype_1.Supertype))));
exports.IsomorphicQuery = IsomorphicQuery;
;
var AppController = /** @class */ (function (_super) {
    __extends(AppController, _super);
    function AppController() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return AppController;
}(_1.Remoteable(amorphic_bindster_1.Bindable(supertype_1.Supertype))));
exports.AppController = AppController;
;
var SubController = /** @class */ (function (_super) {
    __extends(SubController, _super);
    function SubController() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SubController;
}(_1.Remoteable(supertype_1.Supertype)));
exports.SubController = SubController;
;
var Everything = /** @class */ (function (_super) {
    __extends(Everything, _super);
    function Everything() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Everything;
}(persistor_1.Persistable(_1.Remoteable(amorphic_bindster_1.Bindable(supertype_1.Supertype)))));
exports.Everything = Everything;
;
