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
    var baseUrl = "http://bbc.api.mashery.com/juicer-ld-api/storylines/graphs";
    var stabbings = "http://www.bbc.co.uk/things/f84c3738-30f8-4ece-b285-227b59979d21";
    var apiKey = "cy6pbw3vcekftsgv7kjndrdq";
    var url = "http://localhost:3000?url=" +
        encodeURIComponent(baseUrl + "?uri=" + stabbings + "&api_key=" + apiKey);

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
