var margins = { top: 20, right: 50, left: 100, bottom: 75 },
    parse_date = d3.time.format("%m/%Y").parse,
    height = 400 - margins.top - margins.bottom;

localStorage.clear();
localStorage.setItem('path', 'all_by_state/US.csv');
localStorage.setItem('month', '01');
localStorage.setItem('state-name', 'US');

var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

d3.select('#state').on('change', function() {
    var selected_state_name = this.options[this.selectedIndex].innerHTML;
    var state = d3.select(this);
    var state_val = state.prop("value");
    var path = 'all_by_state/' + state_val + '.csv';

    var month_val = localStorage.getItem('month');
    var month = (month_val) ? month_val : '01';

    d3.selectAll(".selected_state").text(selected_state_name);
    state.prop("value", "");

    localStorage.setItem('path', path);
    localStorage.setItem('state', state_val);
    localStorage.setItem('state-name', selected_state_name);

    render();
});

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

    var precip_colors = ['#543005','#8c510a','#bf812d','#dfc27d','#f6e8c3','#f5f5f5','#c7eae5','#80cdc1','#35978f','#01665e','#003c30'];
    var temp_colors = ['#a50026','#d73027','#f46d43','#fdae61','#fee090','#ffffbf','#e0f3f8','#abd9e9','#74add1','#4575b4','#313695'].reverse();
    var path = localStorage.getItem('path');
    var month = localStorage.getItem('month');
    var state_storage = localStorage.getItem('state-name');
    var state_name = (state_storage === 'US') ? 'the ' + state_storage : state_storage;
    var width = window.innerWidth - 100 - margins.right - margins.left;

    d3.csv(path, function(data) {
        data.forEach(function(d) {
            d.date = d.month + '/' + d.year;
            d.value = +d.value;
            d.anomaly = +d.anomaly;
        });

        /* Sorting & Grouping Data */
        var avgs = avgValues(data);

        // Sort by month and type plus min max values
        var month_sorted =  _.sortByOrder(data, ['month', 'year'], ['asc', 'asc']);

        var month_drought_filtered = dataFilter(month_sorted, 'drought', month, avgs);
        var month_max_filtered = dataFilter(month_sorted, 'max', month, avgs);
        var month_min_filtered = dataFilter(month_sorted, 'min', month, avgs);
        var month_precip_filtered =  dataFilter(month_sorted, 'precip', month, avgs);
        var month_temp_filtered = dataFilter(month_sorted, 'temp', month, avgs);

        var month_drought_max_min_value = maxMin(month_drought_filtered, 'value');
        var month_max_max_min_value = maxMin(month_max_filtered, 'value');
        var month_min_max_min_value = maxMin(month_min_filtered, 'value');
        var month_precip_max_min_value = maxMin(month_precip_filtered, 'value');
        var month_temp_max_min_value = maxMin(month_temp_filtered, 'value');

        /* Bisect data */
        var bisectDate = d3.bisector(function(d) { return parse_date(d.date); }).right;

        /* Scales */
        var xScale = d3.time.scale()
            .domain(d3.extent(data, _.compose(parse_date, ƒ('date'))))
            .range([0, width]);

    //    var month_drought_yScale = yScale(month_drought_filtered, height);
        var month_max_yScale = yScale(month_max_filtered, height);
        var month_min_yScale = yScale(month_min_filtered, height);
        var month_precip_yScale = yScale(month_precip_filtered, height);
        var month_temp_yScale = yScale(month_temp_filtered, height);

        /* Axises */
        var xAxis = getAxis(xScale, "bottom");

        var month_maxYAxis = getAxis(month_max_yScale, "left");
        var month_minYAxis = getAxis(month_min_yScale, "left");
        var month_precipYAxis = getAxis(month_precip_yScale, "left");
        var month_tempYAxis = getAxis(month_temp_yScale, "left");

        var bar_width = barWidth(width, month_precip_filtered);

        /* Fill in all month/state texts */
        d3.selectAll(".selected-month").text(stringDate(month));
        d3.selectAll(".selected-state").text(state_name);

        /* Avg Temp Year */
        var temp_strip_color = stripColors(temp_colors, month_temp_filtered);

        /* Avg Temp Month */
        d3.select("#avg_temp_text").text(monthAvg(avgs, "temp", month));
        d3.select("#hottest").text(month_temp_max_min_value.max[4].value);
        d3.select("#hottest-year").text(month_temp_max_min_value.max[4].year);
        d3.select("#least-hottest").text(month_temp_max_min_value.min[0].value);
        d3.select("#least-hottest-year").text(month_temp_max_min_value.min[0].year);

        var temp_svg = showAxises("#temp_div", "#avg_temp_line", width, xAxis, month_tempYAxis, "Avg. Temperature (F)");
        var temp_line = lineGenerator(xScale, month_temp_yScale, 'value');
        var temp_avg_line = lineGenerator(xScale, month_temp_yScale, 'mean');
        temp_svg = appendPath(temp_svg, "temp_line", "steelblue");
        drawPath("#temp_line", temp_line, month_temp_filtered);

        // Add historic avg
        appendPath(temp_svg, "temp_avg_line", "yellow");
        drawPath("#temp_avg_line", temp_avg_line, month_temp_filtered);

        // hover over
        focusHover(temp_svg, month_temp_filtered, "#temp_div", "degrees");

        // Add temp strip chart
        var tip_temp = d3.tip().attr('class', 'd3-tip').html(function(d) {
            return '<h4 class="text-center">' + stringDate(month) + '(' + d.year + ')</h4>' +
                '<ul class="list-unstyled">' +
                '<li>Historical Avg: ' + monthAvg(avgs, 'temp', month) + ' degrees</li>' +
                '<li>Actual Avg: ' + d.value + ' degrees</li>' +
                '<li>Departure from Avg: ' + d.anomaly + ' degrees</li>' +
                '</ul>';
        });

        drawLegend("#temp_div", temp_colors, month_temp_filtered, "temp");
        drawStrip("#temp_div", tip_temp, temp_strip_color, month_temp_filtered);

        /* Max Temp */
        d3.select("#avg_max_text").text(monthAvg(avgs, "max", month));
        d3.select("#maxtemp").text(month_max_max_min_value.max[4].value);
        d3.select("#maxtemp-year").text(month_max_max_min_value.max[4].year);
        d3.select("#least-maxtemp").text(month_max_max_min_value.min[0].value);
        d3.select("#least-maxtemp-year").text(month_max_max_min_value.min[0].year);

        var max_svg = showAxises("#max_div", "#max_temp", width, xAxis, month_maxYAxis, "Avg. Max. Temperature (F)");
        var max_line = lineGenerator(xScale, month_max_yScale, 'value');
        var max_avg_line = lineGenerator(xScale, month_max_yScale, 'mean');

        max_svg = appendPath(max_svg, "max_line", "firebrick");
        drawPath("#max_line", max_line, month_max_filtered);

        // Add historic avg
        appendPath(max_svg, "max_avg_line", "yellow");
        drawPath("#max_avg_line", max_avg_line, month_max_filtered);

        // hover over
        focusHover(max_svg, month_max_filtered, "#max_div", "degrees");

        // Add max strip chart
        var tip_max = d3.tip().attr('class', 'd3-tip').html(function(d) {
            return '<h4 class="text-center">' + stringDate(month) + '(' + d.year + ')</h4>' +
                '<ul class="list-unstyled">' +
                '<li>Historical Avg: ' + monthAvg(avgs, 'max', month) + ' degrees</li>' +
                '<li>Actual Avg: ' + d.value + ' degrees</li>' +
                '<li>Departure from Avg: ' + d.anomaly + ' degrees</li>' +
                '</ul>';
        });
        var max_strip_color = stripColors(temp_colors, month_max_filtered);

        drawLegend("#max_div", temp_colors, month_max_filtered, "max");
        drawStrip("#max_div", tip_max, max_strip_color, month_max_filtered);

        /* Min Temp */
        d3.select("#avg_min_text").text(monthAvg(avgs, "min", month));
        d3.select("#mintemp").text(month_min_max_min_value.max[4].value);
        d3.select("#mintemp-year").text(month_min_max_min_value.max[4].year);
        d3.select("#least-mintemp").text(month_min_max_min_value.min[0].value);
        d3.select("#least-mintemp-year").text(month_min_max_min_value.min[0].year);

        var min_svg = showAxises("#min_div", "#min_temp", width, xAxis, month_minYAxis, "Avg. Min. Temperature (F)");
        var min_line = lineGenerator(xScale, month_min_yScale, 'value');
        var min_avg_line = lineGenerator(xScale, month_min_yScale, 'mean');

        min_svg = appendPath(min_svg, "min_line", "steelblue");
        drawPath("#min_line", min_line, month_min_filtered);

        // Add historic avg
        appendPath(min_svg, "min_avg_line", "yellow");
        drawPath("#min_avg_line", min_avg_line, month_min_filtered);

        // hover over
        focusHover(min_svg, month_min_filtered, "#min_div", "degrees");

        // Add max strip chart
        var tip_min = d3.tip().attr('class', 'd3-tip').html(function(d) {
            return '<h4 class="text-center">' + stringDate(month) + '(' + d.year + ')</h4>' +
                '<ul class="list-unstyled">' +
                '<li>Historical Avg: ' + monthAvg(avgs, 'min', month) + ' degrees</li>' +
                '<li>Actual Avg: ' + d.value + ' degrees</li>' +
                '<li>Departure from Avg: ' + d.anomaly + ' degrees</li>' +
                '</ul>';
        });
        var min_strip_color = stripColors(temp_colors, month_min_filtered);

        drawLegend("#min_div", temp_colors, month_min_filtered, "min");
        drawStrip("#min_div", tip_min, min_strip_color, month_min_filtered);

        /* Precip */
        d3.select("#avg_precip_text").text(monthAvg(avgs, "precip", month));
        d3.select("#avg_drought_text").text(monthAvg(avgs, "drought", month));
        d3.select("#wettest").text(month_precip_max_min_value.max[4].value);
        d3.select("#wettest-year").text(month_precip_max_min_value.max[4].year);
        d3.select("#least-wettest").text(month_precip_max_min_value.min[0].value);
        d3.select("#least-wettest-year").text(month_precip_max_min_value.min[0].year);

        var precip_svg = showAxises("#precip_div", "#avg_precip", width, xAxis, month_precipYAxis, "Avg. Precipitation (Inches)");
        var precip_line = lineGenerator(xScale, month_precip_yScale, 'value');
        var precip_avg_line = lineGenerator(xScale, month_precip_yScale, 'mean');

        precip_svg = appendPath(precip_svg, "precip_line", "steelblue");
        drawPath("#precip_line", precip_line, month_precip_filtered);

        // Add historic avg
        appendPath(precip_svg, "precip_avg_line", "yellow");
        drawPath("#precip_avg_line", precip_avg_line, month_precip_filtered);

        var tip_precip = d3.tip().attr('class', 'd3-tip').html(function(d) {
            return '<h4 class="text-center">' + stringDate(month) + ' (' + d.year + ')</h4>' +
                '<ul class="list-unstyled"' +
                '<li>Historical Avg: ' + monthAvg(avgs, 'precip', month) + ' inches</li>' +
                '<li>Actual Avg: ' + d.value + ' inches</li>' +
                '<li>Departure from Avg: ' + d.anomaly + ' inches</li>' +
                '</ul>';
        });

        // hover over
        focusHover(precip_svg, month_precip_filtered, "#precip_div", "inches");

        // Precip strip plot
        var precip_strip_color = stripColors(precip_colors, month_precip_filtered);

        drawLegend("#precip_div", precip_colors, month_precip_filtered, "precip");
        drawStrip("#precip_div", tip_precip, precip_strip_color, month_precip_filtered);

        /* Palmer Drought Index */
        d3.select("#least-driest").text(month_drought_max_min_value.max[4].value);
        d3.select("#least-driest-year").text(month_drought_max_min_value.max[4].year);
        d3.select("#driest").text(month_drought_max_min_value.min[0].value);
        d3.select("#driest-year").text(month_drought_max_min_value.min[0].year);

        var palmer_strip_color = stripColors(precip_colors, month_drought_filtered);

        var tip_palmer = d3.tip().attr('class', 'd3-tip').html(function(d) {
            return '<h4 class="text-center">' + stringDate(month) + ' (' + d.year + ')</h4>' +
                '<ul class="list-unstyled"' +
                '<li>Historical Avg: ' + monthAvg(avgs, 'drought', month) + '</li>' +
                '<li>Actual Avg: ' + d.value + '</li>' +
                '<li>Departure from Avg: ' + d.anomaly + '</li>' +
                '</ul>';
        });

        drawLegend("#drought_div", precip_colors, month_drought_filtered, "drought");
        drawStrip("#drought_div", tip_palmer, palmer_strip_color, month_drought_filtered);


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
        function focusHover(chart, data, selector, type) {
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
                        '<h4 class="text-center">' + stringDate(d.month) + ' (' + d.year + ')</h4>' +
                            '<ul class="list-unstyled"' +
                            '<li>Historical Avg: ' + monthAvg(avgs, weather_type, month) + ' ' + type + '</li>' +
                            '<li>Actual Avg: ' + d.value + ' ' + type + '</li>' +
                            '<li>Departure from Avg: ' + d.anomaly + ' ' + type + '</li>' +
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

render();

window.addEventListener("resize", render);