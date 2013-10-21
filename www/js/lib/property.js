define(function (require, exports, module) {
/**
 *
 * @author Patrick Oladimeji
 * @date 10/14/13 14:32:07 PM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, module, self, require*/

(function () {
    "use strict";
    function property(v) {
        var p = function (_) {
            if (!arguments.length) {
                return v;
            }
            v = _;
            return this;
        };
        return p;
    }
    property.version = "0.0.1";

    if (typeof module === undefined) {
        self.property = property;
    } else {
        module.exports = property;
    }
}());

});