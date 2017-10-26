// Set up SVG map
// Set up size
let mapWidth = 750;
let mapHeight = 750;
// Set up projection that the map is using
let projection = d3.geoMercator()
    .center([-122.433701, 37.767683]) // San Francisco, roughly
    .scale(225000)
    .translate([mapWidth / 2, mapHeight / 2]);

// This is the mapping between <longitude, latitude> position to <x, y> pixel position on the map
// projection is a function and it has an inverse:
// projection([lon, lat]) returns [x, y]
// projection.invert([x, y]) returns [lon, lat]

// Select the `<svg id="animal-viz"></svg>` DOM node
let wholeChart = d3.select('#map-viz');


let plotMargin = 0;

// Set the size of the whole chart
// We could have done this in CSS too,
// since it's not dependent on our data
wholeChart
    .attr('width', mapWidth)
    .attr('height', mapHeight);

// Add SVG map at correct size, assuming map is saved in a subdirectory called `data`
wholeChart.append('image')
    .attr('width', mapWidth)
    .attr('height', mapHeight)
    .attr('xlink:href', 'sf-map.svg');

// Append a `g` element to our SVG: we'll work in this for our plot
// It has margins
let plot = wholeChart.append('g')
    .attr('transform', `translate(${plotMargin},${plotMargin})`);

// Fetch the data, transfrom it, load it
// [KYW] I filtered out all rows with no latitude or longitude in Excel
d3.csv('trees_filter_latlong.csv', parseInputRow, loadTreeData);

var circleA = d3.select('#circleA')
    .attr('r', 3)
    .attr('cx', 0)
    .attr('cy', 0)
    .style('fill', 'black')
    .style('visibility', 'hidden');

var radiusA = d3.select('#radiusA')
    .attr('r', 0)
    .attr('cx', 0)
    .attr('cy', 0)
    .style('fill', 'black')
    .style('opacity', 0.1)
    .style('visibility', 'hidden');

var textA = d3.select('#textA')
    .attr('x', 0)
    .attr('y', 0)
    .attr('text-anchor', 'start')
    .style('fill', 'red')
    .style('font-family', 'sans-serif')
    .style('visibility', 'hidden');

var coordsA = null;

var sliderA = document.getElementById('sliderA');
sliderA.addEventListener("input", function() {
    let newRadius = this.value;
    if (coordsA) {
        radiusA.attr('r', newRadius)
            .attr('cx', coordsA[0])
            .attr('cy', coordsA[1])
            .style('visibility', 'visible');
    }
}, false);

let circle = d3.geoCircle();
circle.center([-138.2836697, 47.26998737]).radius();

// Convert weight and height from strings to numbers
function parseInputRow(d) {
    return {
        id: +d.TreeID,
        species: d.qSpecies.toLowerCase(),
        diameter: +d.DBH,
        lon: d.Longitude,
        lat: d.Latitude
    };
}

function multifilterData(treeData) {
    const minDiameter = document.getElementById('diameter-slider').value;
    const speciesQuery = document.getElementById('species').value;
    const circleA = d3.select('#circleA');
    const inCircleData = filterInCircle(treeData, circleA);
    return inCircleData
    .filter(d => d.diameter > minDiameter)
    .filter(d => d.species.includes(speciesQuery))
    ;
}

function loadTreeData(error, treeData) {
    if (error) throw error; // Runs if there's a problem fetching the csv.

    document.getElementById('diameter-slider').addEventListener("input", function() {
        filterDiameter();
        let filteredData = multifilterData(treeData);
        drawTreeScatterPlot(filteredData);
    });
    filterDiameter();

    const sliderA = d3.select('#sliderA');
    sliderA.on('input', function() {
        let filteredData = multifilterData(treeData);
        drawTreeScatterPlot(filteredData);
    });

    drawTreeScatterPlot(treeData);

    const speciesInput = d3.select('#species');
    speciesInput.on('keyup', function() {
        let filteredData = multifilterData(treeData);
        drawTreeScatterPlot(filteredData);
    });

    let wholeChart = d3.select('#map-viz');
    wholeChart.on('click', function() {
        coordsA = d3.mouse(this);
        redrawPoint(circleA, textA, coordsA);
        let filteredData = multifilterData(treeData);
        drawTreeScatterPlot(filteredData);
    });

}

function filterInCircle(data, circle) {
    let whichSlider = (circle.attr('id') === 'circleA') ? 'sliderA' : 'sliderB';
    let circleCoords = [circle.attr("cx"), circle.attr("cy")];
    let radius = document.getElementById(whichSlider).value;
    return data.filter(function(d) {
        const dataCoords = projection([d.lon, d.lat]);
        if (radius >= distance(dataCoords, circleCoords)) {
            return true;
        }
        return false;
    });
}

function redrawPoint(circleObj, textObj, coords) {
    circleObj.attr('cx', coords[0])
        .attr('cy', coords[1])
        .style('visibility', 'visible');
    textObj.attr('x', coords[0])
        .attr('y', coords[1])
        .style('visibility', 'visible');
    radiusA.attr('r', sliderA.value)
        .attr('cx', coordsA[0])
        .attr('cy', coordsA[1])
        .style('visibility', 'visible');

}

function drawTreeScatterPlot(treeData) {
    // Create a selection of circles in our plot (empty on the first go)
    let circles = plot.selectAll('circle');

    // Bind our animal data to the circles, using the "id" field as our key
    let updatedCircles = circles.data(treeData, d => d.id);

    // Could also set the key to "name"!
    // The key for each datapoint can be anything, ideally a unique feature of each datum.
    // If we already have circles that have data joined, D3 will compare the keys
    // of each of those with the keys of the joined data to see:
    // * Does our dataset have datums that aren't already represented by nodes? (we can `enter` these)
    // * Are there nodes which no longer have corresponding datums in the dataset? (we can `exit` these)
    // * Are there nodes whose keys match the keys of the dataset? (these are the `update` selection)
    // By default, D3 uses the index in the data array, in our example that won't work.

    // We'll use "enter" to make circles for new datapoints
    // From https://github.com/d3/d3-selection#selection_enter :
    // "The enter selection is typically used to create 'missing' elements corresponding to new data."
    // "[The selection comprises] placeholder nodes for each datum that had no corresponding DOM element in the selection."
    // "Conceptually, the enter selection’s placeholders are pointers to the parent element"
    let enterSelection = updatedCircles.enter();

    let newCircles = enterSelection.append('circle')
        .attr('r', 3)
        .attr('cx', function (d) {
            let projectedLoc = projection([d.lon, d.lat]);
            //console.log(projectedLoc);
            return projectedLoc[0];
        })
        .attr('cy', function (d) {
            let projectedLoc = projection([d.lon, d.lat]);
            return projectedLoc[1];
        })
        .style('fill', function (d) {
            return 'green';
        });

    // Now we'll select all the circles that no longer
    // have any corresponding data after the data join
    let unselectedCircles = updatedCircles.exit();
    // And we'll remove those nodes form the DOM - poof!
    updatedCircles.exit().remove();
}

function distance(A, B) {
    return Math.sqrt(Math.pow(A[0]- B[0], 2) + Math.pow(A[1] - B[1], 2));
}

function filterDiameter() {
    const diameter = document.getElementById('diameter-slider').value;
    document.getElementById('diameter-text').innerHTML = diameter;
    //d3.selectAll('circle')
    //    .attr('r', radius);
    
}
