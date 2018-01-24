function AcceptingInstitutions(id, data, swiss) {

    // console.log('accepting institutions');
    // console.log(data);

    this.id = id;

    let svg,
        nodes = [],
        mapData,
        fixedRadius = 4;

    if (!this.svg) {
        // check if svg has been craeted, if not runs init()
        svg = this.svg = d3.select(this.id).append('svg');
    }

    let projection = d3.geoMercator(),
        path = d3.geoPath().projection(projection);

    let resetRect = svg.append('rect'),
        cantonsBorders = svg.append('g').classed('cantons-map', true).selectAll('path'),
        node = svg.append("g").selectAll(".node"),
        nodeLabel = svg.append("g").selectAll(".nodeLabel");

    let cantonsLabels = d3.select('.cantons-map').selectAll('text')

    let simulation = d3.forceSimulation(nodes)
        .force("x", d3.forceX(function(d) { return d.centerX }))
        .force("y", d3.forceY(function(d) { return d.centerY }))
        .force("collide", d3.forceCollide(function(d) { return fixedRadius + 0.5 }))
        // general force settings
        .alpha(1)
        .alphaDecay(0.01)
        .on("tick", null)

    let concordatColors = d3.scaleOrdinal()
        .range(['#ca5268', '#85c4c9', '#97e196', '#888888'])
        .range(['#CFB76D', '#79745C', '#B5BA72', '#EAE6DA'])
        .domain(['c1', 'c2', 'c3', 'not specified'])

    let notSpecifiedLabels = d3.scaleOrdinal()
        .domain(['XX1', 'XX2', 'XX3', 'XX4'])
        .range(['Other', 'Region-Nordwest-Innerschweiz', 'Region-Ostschweiz', "Choix-de-l'établissement-ou-de-l'home-selon-le-cas"])

    this.draw = function(config) {

        let thisData = null;

        if (config.year) {
            // console.log(config)
            thisData = data[config.year];
        } else {
            thisData = data[1954];
        }

        // console.log(thisData)

        // console.log(config, thisData);

        width = d3.select(this.id)
            .node()
            .offsetWidth - 60;

        height = width * .6;
        if (height > window.innerHeight) { height = window.innerHeight * .8 }
        svg.attr('width', width)
            .attr('height', height);

        resetRect
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'white')
            .on('click', function() {
                reset();
            })

        // transform topojson to geojson
        let cantons = topojson.feature(swiss, swiss.objects.cantons);

        // adapt map to viewport
        projection.fitSize([width, height - 10], cantons);

        // project map, responsive
        cantonsBorders = cantonsBorders.data(cantons.features);

        cantonsBorders.exit().remove();

        cantonsBorders = cantonsBorders.enter()
            .append('path')
            .classed('canton-contour', true)
            .style('fill', function(d) {
                // console.log(d.properties.abbr)
                let thisConcordat = thisData.nodes.filter(function(e) {
                    return e.id == d.properties.abbr
                })
                if (thisConcordat.length > 0) {
                    thisConcordat = thisConcordat[0].concordat
                } else {
                    thisConcordat = 'not specified';
                }
                // console.log(thisConcordat)
                d.properties.concordat = thisConcordat;
                return d3.color(concordatColors(d.properties.concordat))
            })
            .style('stroke', function(d) {
                return d3.color(concordatColors(d.properties.concordat)).darker(.75);
            })
            .merge(cantonsBorders)
            .on("click", function(d) {

                let sending = [];
                let receiving = [];
                let exchanges = [];
                let viz_message;

                if (config.direction == 'from') {
                    // console.log(config.year, config.direction, d.properties.abbr, d.properties);

                    sending.push(d.properties.abbr);

                    let dataSelection = d3.nest()
                        .key(function(e) { return e.sourceName })
                        .entries(thisData.edges);

                    dataSelection = dataSelection.filter(function(e) {
                        return e.key == d.properties.abbr;
                    })

                    if (dataSelection.length > 0) {
                        dataSelection = dataSelection[0].values;

                        receiving = dataSelection.map(function(e) {
                            return e.targetName;
                        })

                        exchanges = dataSelection.map(function(e) {
                            return {
                                'source': e.sourceName,
                                'target': e.targetName,
                                'target_institutions': e.target_institutions
                            }
                        })
                        // console.log('sending', sending);
                        // console.log('receiving', receiving);
                        // console.log('exchanges', exchanges);
                    } else {
                        // console.log('no cantons receiving from', d.properties.abbr);
                        viz_message = d.properties.name + ' did not send detainees to other cantons in ' + config.year + '.';
                    }

                } else {

                    console.log(config.year, config.direction, d.properties.abbr);
                    receiving.push(d.properties.abbr);

                    let dataSelection = d3.nest()
                        .key(function(e) { return e.targetName })
                        .entries(thisData.edges);

                    dataSelection = dataSelection.filter(function(e) {
                        return e.key == d.properties.abbr;
                    })

                    if (dataSelection.length > 0) {
                        dataSelection = dataSelection[0].values;

                        sending = dataSelection.map(function(e) {
                            return e.sourceName;
                        })

                        exchanges = dataSelection.map(function(e) {
                            return {
                                'source': e.sourceName,
                                'target': e.targetName,
                                'target_institutions': e.target_institutions
                            }
                        })
                        // console.log('sending', sending);
                        // console.log('receiving', receiving);
                        // console.log('exchanges', exchanges);
                    } else {
                        // console.log('no cantons sending to', d.properties.abbr);
                        viz_message = d.properties.name + ' did not received detainees from other cantons in ' + config.year + '.';
                    }

                }

                let target_institutions_ids = [];
                exchanges.forEach(function(e) {
                    target_institutions_ids = target_institutions_ids.concat(e.target_institutions);
                })

                target_institutions_ids = _.uniq(target_institutions_ids);

                let target_institutions = [];
                target_institutions_ids.forEach(function(e) {
                    let correspondingId = masterData.filter(function(f) {
                        return e == f.id;
                    })
                    target_institutions.push(correspondingId[0]);
                })

                target_institutions.forEach(function(e) {
                    e.centerX = projection([e.longitude, e.latitude])[0];
                    e.centerY = projection([e.longitude, e.latitude])[1];
                    e.x = e.centerX;
                    e.y = e.centerY;
                })

                let receivingNotPlottable = exchanges.filter(function(e) {
                    return e.target == 'XX1' || e.target == 'XX2' || e.target == 'XX3' || e.target == 'XX4';
                })

                if (receivingNotPlottable.length > 0) {
                    // console.log(receivingNotPlottable);
                    receivingNotPlottable.forEach(function(f) {
                        // console.log(f.target, notSpecifiedLabels(f.target))
                        target_institutions.push({
                            "accepted_gender": "not specified",
                            "canton": "not specified",
                            "canton_code": "SG",
                            "capacity": "",
                            "capacity_group": "not specified",
                            "centerX": width - 100,
                            "centerY": 100,
                            "city": "not specified",
                            "closed": "not specified",
                            "committing_agencies": "not specified",
                            "confession": "not specified",
                            "funding_agency": "not specified",
                            "id": f.target,
                            "index": null,
                            "institution": "not specified",
                            "name_landmark": notSpecifiedLabels(f.target),
                            "opened": "not specified",
                            "typologies": "not specified",
                            "x": width - (width / 5),
                            "y": height / 5
                        })
                    })
                }

                reset();

                d3.selectAll(id + ' .canton-contour').each(function(e) {
                    d3.select(this).classed('faded', true)
                    let matchSending = sending.filter(function(f) {
                        return f == e.properties.abbr
                    })
                    if (matchSending.length > 0) {
                        d3.select(this).classed('sending', true).classed('faded', false);
                    }

                    let matchReceiving = receiving.filter(function(f) {
                        return f == e.properties.abbr
                    })
                    if (matchReceiving.length > 0) {
                        d3.select(this).classed('receiving', true).classed('faded', false);
                    }
                })

                d3.selectAll(id + ' .label').each(function(e) {
                    d3.select(this).classed('faded', true)
                    let matchSending = sending.filter(function(f) {
                        return f == e.properties.abbr
                    })
                    if (matchSending.length > 0) {
                        d3.select(this).classed('sending', true).classed('faded', false);
                    }

                    let matchReceiving = receiving.filter(function(f) {
                        return f == e.properties.abbr
                    })
                    if (matchReceiving.length > 0) {
                        d3.select(this).classed('receiving', true).classed('faded', false);
                    }
                })

                d3.select(this)
                    .styles({
                        'stroke': d3.color(concordatColors(d.properties.concordat)).darker(1),
                        'fill': d3.color(concordatColors(d.properties.concordat)).brighter(.2)
                    })

                svg.append('text')
                    .attr('id', 'viz-message')
                    .styles({
                        'text-anchor': 'middle'
                    })
                    .attr('x', width / 2)
                    .attr('y', height - 5)
                    .text(viz_message)

                nodes = target_institutions;
                update();

            })

            .attr('d', path);

        cantonsLabels = cantonsLabels.data(cantons.features);
        cantonsLabels.exit().remove();
        cantonsLabels = cantonsLabels.enter()
            .append('text')
            .classed('label', true)
            .attr('text-anchor', 'middle')
            .text(function(d) {
                return d.properties.name
            })
            .merge(cantonsLabels)
            .attr('x', function(d) {
                d.labelPosition = turf.centerOfMass(d);
                return projection(d.labelPosition.geometry.coordinates)[0];
            })
            .attr('y', function(d) {
                return projection(d.labelPosition.geometry.coordinates)[1];
            });


        function update() {

            // Apply general update pattern to nodes
            node = node.data(nodes, function(d) { return d.id; });
            node.exit().transition()
                .duration(500)
                .attr('r', 0)
                .remove();

            node = node.enter()
                .append("circle")
                .classed('node', true)
                .attr("r", 0)
                .style('cursor', 'pointer')
                .merge(node)
                .on('click', function(d) {
                    buildSidepanel(d.id, 1900);
                })
                // .on('mouseenter', function(d) {
                //     d3.selectAll(id + ' .node')
                //         .style('opacity', .4)
                //
                //     d3.select(this)
                //         .style('opacity', 1)
                //         .transition()
                //         .duration(300)
                //         .attr('r', fixedRadius * 1.5)
                //
                //     d3.selectAll(id + ' .nodeLabel')
                //         .filter(function(e) { return e.id == d.id })
                //         .transition()
                //         .duration(500)
                //         .style('opacity', 1)
                // })
                // .on('mouseout', function(d) {
                //     d3.selectAll(id + ' .node')
                //         .style('opacity', 1)
                //
                //     d3.select(this).transition()
                //         .duration(300)
                //         .attr('r', fixedRadius)
                //
                //     d3.selectAll(id + ' .nodeLabel')
                //         .filter(function(e) { return e.id == d.id })
                //         .transition()
                //         .duration(500)
                //         .style('opacity', 0)
                // })


            node.transition()
                .duration(500)
                .attr('r', fixedRadius)



            nodeLabel = nodeLabel.data(nodes, function(d) { return d.id; });
            nodeLabel.exit().remove();

            nodeLabel = nodeLabel.enter()
                .merge(nodeLabel)
                .append("text")
                .classed('nodeLabel', true)
                .text(function(d) { return d.name_landmark })


            simulation
                .nodes(nodes)
                .alpha(1)
                .on("tick", ticked)
                .restart()

            function ticked() {
                node.attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; })

                nodeLabel.attr("x", function(d) { return d.x; })
                    .attr("y", function(d) { return d.y - fixedRadius - 3; })
            }
        }
        reset();

        function reset() {

            d3.selectAll(id + ' .canton-contour')
                .classed('sending', false)
                .classed('receiving', false)
                .classed('faded', false)
                .styles({
                    'stroke': function(d) {
                        return d3.color(concordatColors(d.properties.concordat)).darker(.75)
                    },
                    'stroke-width': '.5px',
                    'fill': function(d) { return d3.color(concordatColors(d.properties.concordat)) }
                });
            d3.selectAll(id + ' .label').classed('faded', false);

            d3.selectAll('#viz-message').remove();

            node = node.data([], function(d) { return d.id; })

            node.exit().transition()
                .duration(500)
                .attr('r', 0)
                .filter(function(d) { return d.canton == 'not specified'; })
                .duration(1000)
                .attr('cx', width)
                .remove()

            nodeLabel = nodeLabel.data([], function(d) { return d.id; })

            nodeLabel.exit().transition()
                .duration(500)
                .style('opacity', 0)
                .remove()
        }


    } // draw

} // all
