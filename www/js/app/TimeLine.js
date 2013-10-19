/**
 * Visualise timeline in storyline
 * @author Patrick Oladimeji
 * @date 10/17/13 16:28:01 PM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, d3, require, $, brackets, window, MouseEvent */
define(function (require, exports, module) {
    var _ = require("underscore");
    var queue = require("queue");

    var baseUrl = "http://bbc.api.mashery.com/juicer-ld-api/storylines/graphs";
    var apiKey = "cy6pbw3vcekftsgv7kjndrdq"

    function reconcileStoryLine(s, cb) {
        var storylineSlots = s.hasSlot["@set"];
        var q = queue();
        storylineSlots.forEach(function (sl) {
            q.defer(d3.json, "http://localhost:3000?url=" + encodeURIComponent(baseUrl + "?uri=" + sl["@id"] + "&api_key=" + apiKey));
        });

        q.awaitAll(cb);
    }

    function createTagCloud() {
        var w = 500, h = 200;
        d3.json("people.json", function (err, res) {
            console.log(res);
            var data = _.filter(res, function (value, key) {
                if ( value.articles && value.articles.length || value.events && value.events.length || value.storylines && value.storylines.length) {
                    value.name = key;
                    return true;
                } else {
                    return false;
                }
            });

            data = _.map(data, function (value, name ) {
                var mentions = value.events.reduce(function (a, b) {
                    return {mentions: a.mentions + b.mentions};
                }, {mentions: 0}).mentions;
                return {text: value.name, articles: value.articles, events: value.events, storylines: value.storylines, size: mentions};
            });
            var fill = d3.scale.category20();

            d3.layout.cloud().size([w, h]).words(data)
                .padding(2).rotate(function() { return 0; })
                  .font("Impact")
                  .fontSize(function(d) { return d.size; })
                  .on("end", draw)
                  .start();

            function draw(words) {
                d3.select("#tagCloud").append("svg")
                    .attr("width", w)
                    .attr("height", h).style("margin-bottom", "-100px")
                  .append("g")
                    .attr("transform", "translate(200,100)")
                  .selectAll("text")
                    .data(words)
                  .enter().append("text")
                    .style("font-size", function(d) { return d.size + "px"; })
                    .style("font-family", "Impact")
                    .style("fill", function(d, i) { return "white"; })
                    .attr("text-anchor", "middle")
                    .attr("transform", function(d) {
                      return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                    })
                    .text(function(d) {
                        return d.text;
                    }).on("mouseover", function (d, i) {
                        d3.selectAll("#tagCloud text").classed("selected", false);
                        d3.select(this).classed("selected", true);
                        //higlight the events where this person appears
                        var events = d.events;
                        d3.selectAll("circle.event").each(function (d, i) {
                            if (events.some(function (e) {
                                return e.id === d.id;
                            })) {
                                d3.select(this).classed("highlighted", true);
                                console.log("classed");
                            } else {
                                d3.select(this).classed("highlighted", false).classed("faded", true);
                                console.log("un classed");
                            }
                        });
                    }).on("mouseout", function (d, i) {
                        d3.selectAll("circle").classed("highlighted", false).classed("faded", false);
                    });
                }
            });

    }

    createTagCloud();

    function getSubStoryLines(storyLine, storyLineSlots, storyLines) {
        var res = storyLine.hasSlot["@set"].map(function (sl, i) {
            var slot = storyLineSlots.filter(function (d) {
                return d["@id"] === sl["@id"];
            })[0];
            if (slot) {
                var temp = storyLines.filter(function (d) {
                    return d["@id"] === slot.contains["@id"];
                })[0];

                if (temp) {
                    return temp;
                } else {
                    return null;//maybe look into the other storylines ..
                }
            }
            return null;
        }).filter(function (d) {
            return d;
        });
        return res;
    }

    function getEventsInStoryLine(storyLine, storyLineSlots, events) {

        var res = storyLine.hasSlot["@set"].map(function (sl, i) {
            var slot = storyLineSlots.filter(function (d) {
                return d["@id"] === sl["@id"];
            })[0];
            if (slot) {
                var temp = events.filter(function (d) {
                    return d["id"] === slot.contains["@id"];
                })[0];

                if (temp) {
                    return temp;
                } else {
                    return null;
                }
            }
            return null;
        }).filter(function (d) {
            return d;
        });
        return res;
    }

    function getTimeVineData(mainEvents, subStoryEvents, xscale) {
        var res = [], height = 300, vspace = height/ (subStoryEvents.length + 1);
        subStoryEvents = subStoryEvents.map(function (d, i) {
            return d.sort(function (a, b) {
                return a.date - b.date;
            });
        });
        var mainLineY = 0;
        var lines = subStoryEvents.sort(function (a, b) {
             return a[0].date - b[0].date;
        }).map(function (d, dindex, events) {
            var points = d.map(function (e, i) {
                e.x = xscale(e.date);
                e.y = i === 0 ? 0 : (subStoryEvents.length - dindex) * vspace;
                return e;
            });
            //hack to remove line bug in story line
            if (dindex === 5) {
                return points.slice(0, - 2);
            }
            return points;
        });

        //add the main story line bug here probably
        lines.push(mainEvents.map(function (ex) {
            var e = _.clone(ex);
            e.x = xscale(e.date);
            e.y = 0;
            e.mainStoryLineEvent = true;
            return e;
        }))
        return lines;
    }


    function render(data) {
        var tickSize = 20, eventRad = 5, sslHeight = 200;
        var margin = {top: 50, right: 20, left: 20, bottom: 20}, h = 400, w = 1000;
        var main = d3.select(".svgContainer").append("svg").attr("width", w + margin.left + margin.right).attr("height", h);
        var timeLine = main.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        var graph = data["@graph"];

        var storyLines = graph.filter(function (d) {
            return d["@type"] === "Storyline";
        });
        var mainStoryLine = storyLines.filter(function (d) {
            return d.hasSlot;
        })[0];

        var storyLineSlots = graph.filter(function (d) {
            return d["@type"] === "StorylineSlot";
        });

        var events = data["@graph"].filter(function (d) {
            return d["@type"] === "Event";
        }).map(function (d) {
            return {id: d['@id'], date: new Date(Date.parse(d.eventStartDate)), preferredLabel: d.preferredLabel, taggedOn: d.taggedOn};
        }).sort(function (a, b) {
            return a.date - b.date;
        });

        var mainEvents = getEventsInStoryLine(mainStoryLine, storyLineSlots, events).sort(function (a, b) {
            return a.date - b.date;
        });

        var allEvents = events.map(function (e) {
             e.mainEvent = mainEvents.some(function (d) {
                    return e.id === d.id;
             });
            return e;
        });

        var subStoryLines = getSubStoryLines(mainStoryLine, storyLineSlots, storyLines);

        var subStoryEvents = subStoryLines.map(function (d) {
            return getEventsInStoryLine(d, storyLineSlots, events).sort(function (a, b) {
                return a.date - b.date;
            });
        });
        console.log(subStoryEvents);

        function radf(d, i) {
            if (d3.select(this).classed("mouseover")) {
                return d.taggedOn ? 10 : 6;
            }
            return d.taggedOn ? 8 : 4;
        }
        var xscale = d3.time.scale().range([0, w]).domain([_.first(allEvents).date, _.last(allEvents).date]),
            xAxis = d3.svg.axis().scale(xscale).tickSubdivide(false);

        var timeVineData = getTimeVineData(mainEvents, subStoryEvents, xscale);
        var lf = d3.svg.line()
            .x(function (d) {
                return d.x;
            }).y(function (d) {
                return d.y;
            }).interpolate("linear");

 //draw a horizontal line to show the timeline
        timeLine.append("g").attr("class", "x axis").call(xAxis)
            .selectAll("text")
            .attr("dy", -20) ;
        var tg =  timeLine.append("g").selectAll("g.timevine").data(timeVineData)
            .enter().append("g").attr("class", "timevine");

        var timevineG = tg.append("path").attr("d", function (d) {
                return lf(d);
            }).attr("fill", "none")
            .attr("stroke", "blue").attr("class", function (d, i) {
                return i === timeVineData.length - 1 ? "mainStoryLineEvent" : "";
            });



         var eventCircles = tg.selectAll("circle.event").data(function (d) {
            return d;}).enter().append("circle")
            .attr("cx", function (d) {
                return d.x;
            }).attr("cy", function (d) {
                return d.y;
            }).attr("class", function (d) {
                return "event " + (d.taggedOn ? "hasArticle" : "");
            }).attr("r", radf);

        eventCircles.on("mouseover", function (d, i) {
            d3.select(this).classed("mouseover", true).attr("r", radf);
            if (d.taggedOn) {
                var ids = d.taggedOn["@set"] ? d.taggedOn["@set"].map(function (ne) {return ne["@id"];})
                    : [d.taggedOn["@id"]];

                //also class related events to say they are highlighted
                //check through all the events and tag those who have news items found in the news items of the selected itm
                d3.selectAll("circle.event").each(function (d, i) {
                    var d3el = d3.select(this);
                    if (d.taggedOn) {
                        var tids = d.taggedOn["@set"] ? d.taggedOn["@set"].map(function (ne) {return ne["@id"];})
                            : [d.taggedOn["@id"]];
                        if (tids && tids.length) {
                            var hasSome = tids.some(function (a) {
                                return ids.some(function (b) {
                                    return a === b;
                                }) ;
                            });
                            if (hasSome) {
                                d3el.classed("highlighted", true).classed("faded", false);
                            } else {
                                d3el.classed("faded", true).classed("higlighted", false);
                            }
                        }
                    } else {
                        d3el.classed("faded", true).classed("higlighted", false);
                    }
                });
                var article = d.taggedOn["@set"] ? d.taggedOn["@set"][0] : d.taggedOn;
                d3.select("#title").html(article.title);
                var link = d3.select(".details").html(article.description).append("a").attr("href", article["@id"]).html(" " + article["@id"]);

                $(link.node()).click(function () {
                    var url = link.attr("href");
                    updateURL(url);
                    changeData(url);
                    loading(); // loading
                    setTimeout(function(){ // then show popup, deley in .5 second
                        loadPopup(); // function show popup
                    }, 500); // .5 second
                    return false;
                });
            }else {
                d3.select("#title").html(d.preferredLabel);
                d3.select(".details").html("");//.append("a").attr("href", article["@id"]).html(article["@id"]);
            }

        }).on("mouseout", function (d, i) {
            d3.select(this).classed("mouseover", false).classed("highlighted", false).attr("r", radf);
            //remove any other highlighted data
            d3.selectAll("circle").classed("highlighted", false).classed("faded", false);
        }).on("click", function (d, i) {
            if (d.taggedOn) {
//                var article = d.taggedOn["@set"] ? d.taggedOn["@set"][0] : d.taggedOn;
//                d3.select("#title").html(article.title);
//                d3.select(".details").html(article.description).append("a").attr("href", article["@id"]).html(article["@id"]);
            }
        });
        //draw the  mainEvents
//        var eventG = timeLine.selectAll("g.event").data(mainEvents)
//            .enter().append("g")
//            .attr("class", "event")
//            .attr("transform", function (d, i) {
//                return "translate(" + xscale(d.date) + ")";
//            });
//
//        var eventDots = eventG.append("circle")
//            .attr("cy", -20)
//            .attr("r", function (d) {
//                return d.mainEvent ? 8 : 2;
//            }).attr("class", function (d) {
//                var hasArticle = d.taggedOn ? "hasArticle" : "";
//                var c = d.mainEvent ? "main " : "other ";
//                return c + hasArticle;
//            })
//            .append("title").text(function (d) {
//                return d.date.toDateString();
//            });
//
//        eventDots.on("mouseover", function (d, i) {
//
//        }).on("mouseout", function (d, i) {
//
//        })
//        .on("click", function (d, i) {
//           // d3.json("stories/" + d.taggedOn)
//        });




//        var sslVscale = d3.scale.linear().range([0, sslHeight]).domain([0, subStoryEvents.length]);
//        var sslContainer = main.append("g").attr("transform", "translate(" + margin.left + ", 100)");
//        var sslg = sslContainer.selectAll("g.ssl").data(subStoryEvents).enter()
//            .append("g").attr("class", "ssl")
//            .attr("transform", function (d, i) {
//                return "translate(" + xscale(d[0].date) + "," + sslVscale(i) + ")";
//            });
//
//        //add the line
//        sslg.append("rect").attr("class", "substory")
//            .attr("width", function (d) {
//                return Math.abs(xscale(d[0].date) - xscale(d[d.length - 1].date));
//            }).attr("height", 5);
//
//        sslg.selectAll("cirle.event").data(function (d) {
//            return d.map(function (e) {
//                return {start: d[0], data: e};
//            });
//        }).enter().append("circle")
//            .attr("class", function (d) {
//                var hasArticle = d.data.taggedOn ? "hasArticle" : "";
//                var c = "event ";
//                return c + hasArticle;
//            }).attr("r", 2).attr("cx", function (d) {
//                return xscale(d.data.date) - xscale(d.start.date);
//            }).attr("cy", -2);


    }

    var URL = "http://www.bbc.co.uk";

    $("a.topopup").click(function() {
            updateURL("http://www.bbc.co.uk/sport/0/");
            changeData(URL);
            loading(); // loading
            setTimeout(function(){ // then show popup, deley in .5 second
                loadPopup(); // function show popup
            }, 500); // .5 second
    return false;
    });

    /* event for close the popup */
    $("div.close").hover(
                    function() {
                        $('span.ecs_tooltip').show();
                    },
                    function () {
                        $('span.ecs_tooltip').hide();
                      }
                );

    $("div.close").click(function() {
        disablePopup();  // function close pop up
    });

    $(this).keyup(function(event) {
        if (event.which == 27) { // 27 is 'Ecs' in the keyboard
            disablePopup();  // function close pop up
        }
    });

    $("div#backgroundPopup").click(function() {
        disablePopup();  // function close pop up
    });

    $('a.livebox').click(function() {
        alert('Hello World!');
    return false;
    });


     /************** start: functions. **************/
    function loading() {
        $("div.loader").show();
    }
    function closeloading() {
        $("div.loader").fadeOut('normal');
    }

    var popupStatus = 0; // set value

    function updateURL(newURL) {
        URL = newURL;
    }

    function loadPopup() {
        if(popupStatus == 0) { // if value is 0, show popup
            closeloading(); // fadeout loading
            $("#toPopup").fadeIn(0500); // fadein popup div
            $("#backgroundPopup").css("opacity", "0.7"); // css opacity, supports IE7, IE8
            $("#backgroundPopup").fadeIn(0001);
            popupStatus = 1; // and set value to 1
        }
    }

    function disablePopup() {
        if(popupStatus == 1) { // if value is 1, close popup
            $("#toPopup").fadeOut("normal");
            $("#backgroundPopup").fadeOut("normal");
            popupStatus = 0;  // and set value to 0
        }
    }

    function changeData(newURL) {
    if(!document.getElementById("contentarea"))
        return false;
    document.getElementById("contentarea").setAttribute("data", newURL);
    }
    module.exports = render;
});
