/**
 *
 * @author Patrick Oladimeji
 * @date 10/14/13 16:47:54 PM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, d3, require, $, brackets, window, MouseEvent */
define(function (require) {
    "use strict";
    var $ = require("jquery");
    var timeLine = require("./TimeLine");

    d3.json("0-merged.json", function (err, res) {
        if (!err) {
            timeLine(res);
        }
    });

    $(document).ready(function() {
        $('.myCarousel').each(function(){
        $(this).carousel({
        interval: false
        });
        });
    });
});
