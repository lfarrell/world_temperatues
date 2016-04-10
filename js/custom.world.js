var margins = { top: 20, right: 50, left: 100, bottom: 75 },
    parse_date = d3.time.format("%m/%Y").parse,
    height = 400 - margins.top - margins.bottom;

localStorage.clear();
localStorage.setItem('month', '01');


var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

d3.select('#month').on('change', function() {
    var selected_month_name = this.options[this.selectedIndex].innerHTML;
    var month = d3.select(this);
    var month_val = month.prop("value");

    localStorage.setItem('month', month_val);

    d3.selectAll(".selected_month").text(selected_month_name);
    month.prop("value", "");

    render();
});

var render = _.debounce(function() {
    d3.selectAll(".svg").remove();
    d3.selectAll(".heading").remove();

    var temp_colors = ['#a50026','#d73027','#f46d43','#fdae61','#fee090','#ffffbf','#e0f3f8','#abd9e9','#74add1','#4575b4','#313695'].reverse();
    var month = localStorage.getItem('month');
    var width = window.innerWidth - 100 - margins.right - margins.left;

    d3.csv('data/world_all.csv', function(data) {
        data.forEach(function(d) {
            d.date = d.month + '/' + d.year;
            d.actual_avg = _.round(+d.actual_avg, 2);
            d.historic_avg = _.round(+d.historic_avg, 2);
            d.anomaly = _.round(+d.anomaly, 2);
        });

        // Sort by month and type plus min max values
        var month_sorted =  _.sortByOrder(data, ['month', 'year'], ['asc', 'asc']);

        var world_filtered = dataFilter(month_sorted, 'ocean_land', month);
        var land_filtered = dataFilter(month_sorted, 'land', month);
        var ocean_filtered = dataFilter(month_sorted, 'ocean', month);

        var avgs = {
            world: world_filtered[0].historic_avg,
            land: land_filtered[0].historic_avg,
            ocean: ocean_filtered[0].historic_avg
        };

        var world_max_min_value = maxMin(world_filtered, 'actual_avg');
        var land_max_min_value = maxMin(land_filtered, 'actual_avg');
        var ocean_max_min_value = maxMin(ocean_filtered, 'actual_avg');

        /* Bisect data */
        var bisectDate = d3.bisector(function(d) { return parse_date(d.date); }).right;

        /* Scales */
        var xScale = d3.time.scale()
            .domain(d3.extent(data, _.compose(parse_date, ƒ('date'))))
            .range([0, width]);

        var world_yScale = yScale(world_filtered, height);
        var land_yScale = yScale(land_filtered, height);
        var ocean_yScale = yScale(ocean_filtered, height);

        /* Axises */
        var xAxis = getAxis(xScale, "bottom");

        var world_YAxis = getAxis(world_yScale, "left");
        var land_YAxis = getAxis(land_yScale, "left");
        var ocean_YAxis = getAxis(ocean_yScale, "left");

        var bar_width = barWidth(width, world_filtered);

        /* Fill in all month/state texts */
        d3.selectAll(".selected-month").text(stringDate(month));


        /* Avg World Year */
        var world_strip_color = stripColors(temp_colors, world_filtered);

        /* Avg World Temp Month */
        d3.select("#avg_temp_text").text(avgs.world);
        d3.select("#hottest").text(world_max_min_value.max[4].actual_avg);
        d3.select("#hottest-year").text(world_max_min_value.max[4].year);
        d3.select("#least-hottest").text(world_max_min_value.min[0].actual_avg);
        d3.select("#least-hottest-year").text(world_max_min_value.min[0].year);

        var temp_svg = showAxises("#world_div", "#avg_temp_line", width, xAxis, world_YAxis);
        var temp_line = lineGenerator(xScale, world_yScale, 'actual_avg');
        var temp_avg_line = lineGenerator(xScale, world_yScale, 'historic_avg');
        temp_svg = appendPath(temp_svg, "temp_line", "firebrick");
        drawPath("#temp_line", temp_line, world_filtered);

        // Add historic avg
        appendPath(temp_svg, "temp_avg_line", "yellow");
        drawPath("#temp_avg_line", temp_avg_line, world_filtered);

        // hover over
        focusHover(temp_svg, world_filtered, "#world_div");

        // Add temp strip chart
       var tip_temp = d3.tip().attr('class', 'd3-tip').html(function(d) {
            return '<h4 class="text-center">' + stringDate(month) + '(' + d.year + ')</h4>' +
                '<ul class="list-unstyled">' +
                '<li>Historical Avg: ' + d.historic_avg + ' degrees (C)</li>' +
                '<li>Actual Avg: ' + d.actual_avg + ' degrees (C)</li>' +
                '<li>Departure from Avg: ' + d.anomaly + ' degrees (C)</li>' +
                '</ul>';
        });

        drawLegend("#world_div", temp_colors, world_filtered);
        drawStrip("#world_div", tip_temp, world_strip_color, world_filtered);

        /* Land Temp */
        d3.select("#avg_max_text").text(avgs.land);
        d3.select("#maxtemp").text(land_max_min_value.max[4].actual_avg);
        d3.select("#maxtemp-year").text(land_max_min_value.max[4].year);
        d3.select("#least-maxtemp").text(land_max_min_value.min[0].actual_avg);
        d3.select("#least-maxtemp-year").text(land_max_min_value.min[0].year);

        var max_svg = showAxises("#land_div", "#max_temp", width, xAxis, land_YAxis);
        var max_line = lineGenerator(xScale, land_yScale, 'actual_avg');
        var max_avg_line = lineGenerator(xScale, land_yScale, 'historic_avg');

        max_svg = appendPath(max_svg, "max_line", "firebrick");
        drawPath("#max_line", max_line, land_filtered);

        // Add historic avg
        appendPath(max_svg, "max_avg_line", "yellow");
        drawPath("#max_avg_line", max_avg_line, land_filtered);

        // hover over
        focusHover(max_svg, land_filtered, "#land_div");

        // Add max strip chart
        var tip_max = d3.tip().attr('class', 'd3-tip').html(function(d) {
            return '<h4 class="text-center">' + stringDate(month) + '(' + d.year + ')</h4>' +
                '<ul class="list-unstyled">' +
                '<li>Historical Avg: ' + d.historic_avg + ' degrees (C)</li>' +
                '<li>Actual Avg: ' + d.actual_avg + ' degrees (C)</li>' +
                '<li>Departure from Avg: ' + d.anomaly + ' degrees (C)</li>' +
                '</ul>';
        });
        var max_strip_color = stripColors(temp_colors, land_filtered);

        drawLegend("#land_div", temp_colors, land_filtered);
        drawStrip("#land_div", tip_max, max_strip_color, land_filtered);

        /* Min Temp */
        d3.select("#avg_min_text").text(avgs.ocean);
        d3.select("#mintemp").text(ocean_max_min_value.max[4].actual_avg);
        d3.select("#mintemp-year").text(ocean_max_min_value.max[4].year);
        d3.select("#least-mintemp").text(ocean_max_min_value.min[0].actual_avg);
        d3.select("#least-mintemp-year").text(ocean_max_min_value.min[0].year);

        var min_svg = showAxises("#ocean_div", "#min_temp", width, xAxis, ocean_YAxis);
        var min_line = lineGenerator(xScale, ocean_yScale, 'actual_avg');
        var min_avg_line = lineGenerator(xScale, ocean_yScale, 'historic_avg');

        min_svg = appendPath(min_svg, "min_line", "firebrick");
        drawPath("#min_line", min_line, ocean_filtered);

        // Add historic avg
        appendPath(min_svg, "min_avg_line", "yellow");
        drawPath("#min_avg_line", min_avg_line, ocean_filtered);

        // hover over
        focusHover(min_svg, ocean_filtered, "#ocean_div");

        // Add max strip chart
        var tip_min = d3.tip().attr('class', 'd3-tip').html(function(d) {
            return '<h4 class="text-center">' + stringDate(month) + '(' + d.year + ')</h4>' +
                '<ul class="list-unstyled">' +
                '<li>Historical Avg: ' + d.historic_avg + ' degrees (C)</li>' +
                '<li>Actual Avg: ' + d.actual_avg + ' degrees (C)</li>' +
                '<li>Departure from Avg: ' + d.anomaly + ' degrees (C)</li>' +
                '</ul>';
        });
        var min_strip_color = stripColors(temp_colors, ocean_filtered);

        drawLegend("#ocean_div", temp_colors, ocean_filtered);
        drawStrip("#ocean_div", tip_min, min_strip_color, ocean_filtered);


        /**
         * Draw strip chart
         * @param selector
         * @param tip
         * @param strip_color
         * @param data
         * @returns {string|CanvasPixelArray|function({data: (String|Blob|ArrayBuffer)})|Object[]|string}
         */
        function drawStrip(selector, tip, strip_color, data) {
            var strip = d3.select(selector).append("svg")
                .attr("width", width + margins.left + margins.right)
                .attr("height", 110)
                .attr("class", "svg")
                .call(tip);

            var add = strip.selectAll("bar")
                .data(data);

            add.enter().append("rect");

            add.attr("x", function(d) { return xScale(parse_date(d.date)); })
                .attr("width", bar_width)
                .attr("y", 0)
                .attr("height", 80)
                .translate([margins.left, 0])
                .style("fill", _.compose(strip_color, ƒ('anomaly')))
                .on('mouseover touchstart', function(d) {
                    d3.select(this).attr("height", 100);
                    tip.show.call(this, d);
                })
                .on('mouseout touchend', function(d) {
                    d3.select(this).attr("height", 80);
                    tip.hide.call(this, d);
                });

            return add;
        }

        /**
         * Add svg path to a chart
         * @param svg
         * @param id
         * @param color
         * @returns {*}
         */
        function appendPath(svg, id, color) {
            svg.append("path#" + id)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 2.5)
                .translate([margins.left, margins.top]);

            return svg;
        }

        /**
         * Draw SVG path
         * @param selector
         * @param scale
         * @param data
         * @returns {*}
         */
        function drawPath(selector, scale, data) {
            return d3.select(selector).transition()
                .duration(1000)
                .ease("sin-in-out")
                .attr("d", scale(data));
        }

        /**
         * Add overlay circle & text
         * @param chart
         * @returns {CSSStyleDeclaration}
         */
        function focusHover(chart, data, selector) {
            var weather_type = selector.split('_')[0].substr(1);
            var focus = chart.append("g")
                .attr("class", "focus")
                .style("display", "none");

            focus.append("line")
                .attr("class", "y0")
                .attr({
                    x1: 0,
                    y1: 0,
                    x2: 0,
                    y2:height

                });

            chart.append("rect")
                .attr("class", "overlay")
                .attr("width", width)
                .attr("height", height)
                .on("mouseover touchstart", function() { focus.style("display", null); })
                .on("mouseout touchend", function() {
                    focus.style("display", "none");
                    div.transition()
                        .duration(250)
                        .style("opacity", 0);
                })
                .on("mousemove touchmove", mousemove)
                .translate([margins.left, margins.top]);

            function mousemove() {
                var x0 = xScale.invert(d3.mouse(this)[0]),
                    i = bisectDate(data, x0, 1),
                    d0 = data[i - 1],
                    d1 = data[i];

                if(d1 === undefined) d1 = Infinity;
                var d = x0 - d0.key > d1.key - x0 ? d1 : d0;

                var transform_values = [(xScale(parse_date(d.date)) + margins.left), margins.top];
                d3.select(selector + " line.y0").translate(transform_values);

                div.transition()
                    .duration(100)
                    .style("opacity", .9);

                div.html(
                        '<h4 class="text-center">' + stringDate(month) + ' (' + d.year + ')</h4>' +
                            '<ul class="list-unstyled"' +
                            '<li>Historical Avg: ' + d.historic_avg + ' degrees (C)</li>' +
                            '<li>Actual Avg: ' + d.actual_avg + ' degrees (C)</li>' +
                            '<li>Departure from Avg: ' + d.anomaly + ' degrees (C)</li>' +
                            '</ul>'

                    )
                    .style("top", (d3.event.pageY-108)+"px")
                    .style("left", (d3.event.pageX-28)+"px");
            }

            return chart;
        }

        var rows = d3.selectAll('.row');
        rows.classed('opaque', false);
        rows.classed('hide', false)
        d3.selectAll('#load').classed('hide', true);
    });
}, 400);

/**
 * Filter data
 * @param datas
 * @param value
 * @param value_two
 * @returns {Array|NodeFilter}
 */
function dataFilter(datas, type, month) {
    return datas.filter(function(d) {
        return d.type === type && d.month === month;
    });
}

/**
 * Min & Max values
 * @param data
 * @param value
 * @returns {{min: (Array|string|Blob), max: (Array|string|Blob)}}
 */
function maxMin(data, value) {
    var sorted = _.sortBy(data, value);
    var min = sorted.slice(0, 5);
    var max = sorted.slice(-5);

    return { min: min, max: max };
}

/**
 * Bar width for barcode charts
 * @param width
 * @param data
 * @returns {number}
 */
function barWidth(width, data) {
    return _.floor((width / data.length), 3);
}

/**
 * Y scale for values charts
 * @param data
 * @param height
 * @returns {*}
 */
function yScale(data, height) {
    var y_scale =  d3.scale.linear().range([0, height]);

    return y_scale.domain([d3.max(data, ƒ('actual_avg')), 0])
}

/**
 * Color codes for strip charts
 * @param values
 * @param data
 * @param type
 * @returns {*}
 */
function stripColors(values, data) {
    return d3.scale.quantize()
        .domain(d3.extent(data, ƒ('anomaly')))
        .range(values);
}

/**
 * Draw a legend
 * @param selector
 * @param color_values
 * @param values
 * @returns {*}
 */
function drawLegend(selector, color_values, values) {
    d3.select(selector).append("h4")
        .attr("class", "text-center heading")
        .text("Departure from Average (Anomaly degrees (C))");

    var colors = stripColors(color_values, values);
    var class_name = selector.substr(1);
    var svg = d3.select(selector).append("svg")
        .classed("svg", true)
        .classed("legend", true)
        .attr("width", 1000);

    svg.append("g")
        .attr("class", "legend-" + class_name)
        .attr("width", 900)
        .translate([margins.left, margins.top]);

    var legend = d3.legend.color()
        .shapeWidth(70)
        .orient('horizontal')
        .labelFormat(d3.format(".02f"))
        .scale(colors);

    svg.select(".legend-" + class_name)
        .call(legend);

    return svg;
}

/**
 * Create axises
 * @param scale
 * @param orientation
 * @returns {*}
 */
function getAxis(scale, orientation) {
    return  d3.svg.axis()
        .scale(scale)
        .orient(orientation);
}

/**
 * Draw axises
 * @param selector
 * @param xAxis
 * @param yAxis
 * @param text
 * @returns {*}
 */
function showAxises(selector, svg_selector, width, xAxis, yAxis) {
    var svg = d3.select(selector).append('svg.svg');

    svg.attr("width", width + margins.left + margins.right)
        .attr("height", height + margins.top + margins.bottom)
        .attr("id", svg_selector);

    svg.append("g")
        .attr("class", "x axis")
        .translate([margins.left, (height + margins.top)]);

    d3.selectAll(selector + " g.x").call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .translate([margins.left, margins.top]);

    d3.selectAll(selector + " g.y").call(yAxis);

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height/3)
        .attr("y", 6)
        .attr("dy", "3.71em")
        .style("text-anchor", "end")
        .text("Avg. Temperature (C)");

    return svg;
}

/**
 * Create line path function
 * @param xScale
 * @param yScale
 * @param y
 * @returns {*}
 */
function lineGenerator(xScale, yScale, y) {
    return d3.svg.line()
        .interpolate("monotone")
        .x(function(d) { return xScale(parse_date(d.date)); })
        .y(function(d) { return yScale(d[y]); });
}

/**
 * Get month as word
 * @param month
 * @returns {*}
 */
function stringDate(month) {
    var month_names = ["January", "February", "March",
        "April", "May", "June",
        "July", "August", "September",
        "October", "November", "December"];

    var month_num = parseInt(month, 10) - 1;

    return month_names[month_num];
}

render();

window.addEventListener("resize", render);