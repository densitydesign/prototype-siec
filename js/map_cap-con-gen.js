function MapCategories(id, swiss, data) {

    this.id = id;

    if (data) {
        this.data = d3.nest()
            .key(function(d) { return d.survey_year; })
            .entries(data);
        // console.log(this.data);
        // console.log(swiss);
    }

    //define elements that will be present in the visualization
    let svg,
        mapGroup,
        swissBorderContainer,
        cantonsBorderContainer,
        dotGroup,
        node;

    //define dimensions of the container
    let width,
        height,
        radius;

    // define projection and path-generator variables
    let projection = d3.geoMercator(),
        path = d3.geoPath().projection(projection);

    // transform topojson to geojson
    let swissOutline = topojson.feature(swiss, swiss.objects.country),
        cantons = topojson.feature(swiss, swiss.objects.cantons);

    // cache year
    let currentYear;

    // define color scales, with ranges and domains
    let capacityScale = d3.scaleOrdinal()
        .domain(["0 - 19", "20 - 49", "50 - 99", "100 - 149", "150 - 199", "200 - over", "not specified"])
        .range(['#fae6c4', '#f0b8a3', '#e38984', '#c5626c', '#99445b', '#70284a', '#333333']);
    let confessionScale = d3.scaleOrdinal()
        .domain(["protestants", "catholics", "interdenominational", "not specified"])
        .range(['#50e3c2', '#ff7a5a', '#fcf4d9', '#333333']);
    let genderScale = d3.scaleOrdinal()
        .domain(["males", "females", "both genders", "not specified"])
        .range(['#a7d46f', '#ffed8f', '#e3f8ff', '#333333']);

    // check if svg has already been created and if not, creates it
    if (!this.svg) {
        this.svg = d3.select(this.id)
            .append('svg')
            .classed('map-container', true);
        svg = this.svg;
        mapGroup = svg.append('g').classed('map-swiss', true);
        swissBorderContainer = mapGroup.append('g').classed('map-country', true);
        cantonsBorderContainer = mapGroup.append('g').classed('map-cantons', true);
        dotGroup = svg.append('g').classed('map-dots', true);
    }

    this.draw = function(year, category) {
        //remove precedent map with a transition
        d3.selectAll('#maps-visualization .maps-swiss path')
            .transition()
            .duration(300)
            .style('opacity', 1e-6)
            .remove();
        d3.selectAll('#maps-visualization .maps-dots circle')
            .transition()
            .duration(300)
            .attr('r', 1e-6)
            .remove();
        d3.selectAll('#maps-visualization .maps-label text')
            .transition()
            .duration(300)
            .attr('r', 1e-6)
            .remove();
        d3.select('#maps-visualization .maps-container')
            .style('pointer-events', 'none');

        //calculate width and height of the viz container and set them as svg dimensions
        width = $('#maps-visualization').width();
        height = width * .7;
        radius = 3;
        svg.attr('width', width)
            .attr('height', height)
            .style('position', 'absolute');

        // adapt map to viewport
        projection.fitSize([width, height], cantons);

        // project map
        let swissBorder = swissBorderContainer.selectAll('path')
            .data(swissOutline.features);

        swissBorder.exit()
            .transition()
            .duration(500)
            .style('opacity', 1e-6)
            .remove();

        swissBorder.enter()
            .append('path')
            .classed('swiss-contour', true)
            .style('opacity', 1e-6)
            .merge(swissBorder)
            .attr("d", path)
            .transition()
            .duration(500)
            .style('opacity', 0.5);

        let cantonsBorder = cantonsBorderContainer.selectAll('path')
            .data(cantons.features);

        cantonsBorder.exit()
            .transition()
            .duration(500)
            .style('opacity', 1e-6)
            .remove();

        cantonsBorder.enter()
            .append('path')
            .classed('canton-contour', true)
            .style('opacity', 1e-6)
            .merge(cantonsBorder)
            .attr('d', path)
            .transition()
            .duration(500)
            .style('opacity', 0.5);

        //filter the data for the correct year
        let selectedYear = this.data.filter(function(el){return el.key == year;});
        let institutions = selectedYear[0].values.map(function(d){
            return {
                'x' : getCoordinates(d, 'lon'),
                'y' : getCoordinates(d, 'lat'),
                'id': d.id,
                'capacity_group': d.capacity_group,
                'confession': d.confession,
                'accepted_gender': d.accepted_gender
            };
        });
        // console.log(institutions);

        //draw institutions
        node = dotGroup.selectAll('circle')
            .data(institutions, function(d){
                return d.id;
            });

        node.exit()
            .transition()
            .duration(500)
            .attr('r', 1e-6)
            .remove();

        node = node.enter()
            .append('circle')
            .classed('dot', true)
            .attr('r', 1e-6)
            .style('stroke', '#333333')
            .on("click", function(d) {
                console.table(d);
            })
            .merge(node);

        node.transition()
            .duration(500)
            .delay(function(d, i) { return i * 2 })
            .style('fill', function(d){
                if (category === 'capacity_group') {
                    return capacityScale(d[category]);
                } else if (category === 'confession') {
                    return confessionScale(d[category]);
                } else {
                    return genderScale(d[category]);
                }
            })
            .attr('r', radius);

        d3.forceSimulation().alpha(1)
            .nodes(institutions)
            .force('x', d3.forceX().x(function(d) {
                return d.x;
            }).strength(0.2))
            .force('y', d3.forceY().y(function(d) {
                return d.y;
            }).strength(0.2))
            .force('collision', d3.forceCollide().radius(function(d) {
                return radius + 0.5;
            }))
            .on('tick', ticked)
            .restart();

        function getCoordinates(d, i) {
            var projectedCoords = projection([d.lon, d.lat]);
            // console.log(projectedCoords);
            if (i === 'lon') {
                return projectedCoords[0];
            } else if (i === 'lat') {
                return projectedCoords[1];
            } else {
                return projectedCoords;
            }
        }

        function ticked() {
            node.attr('cx', function(d){return d.x;})
                .attr('cy', function(d){return d.y;});
        }
}
}
