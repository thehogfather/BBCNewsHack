var express = require("express"),
    webServer = express();
var http = require("http");
webServer.use(express.bodyParser({}));
webServer.all("/", function (req, res) {
    var url = req.query.url;
    var r = http.request(url , function (response) {
            var jsonText = "";
            response.setEncoding("utf8");
            response.on("data", function (c) {
                jsonText = jsonText.concat(c);
            })
            .on("end", function () {
                res.set("Content-Type", "application/json");
                res.setHeader("Access-Control-Allow-Origin", "*")
                res.json(JSON.parse(jsonText));
            });
        }).on("error", function (e) {
            console.log(e.message);
        });

    r.end();

});


webServer.listen(3000);
console.log("local server up!");
