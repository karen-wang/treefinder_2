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

let plotMargin = 50;

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

// Convert weight and height from strings to numbers
function parseInputRow(d) {
    return {
        id: +d.TreeID,
        species: d.qSpecies.toLowerCase(),
        // diameter: +d.DBH,
        lon: d.Longitude,
        lat: d.Latitude
    };
}

function loadTreeData(error, treeData) {
    if (error) throw error; // Runs if there's a problem fetching the csv.
    drawTreeScatterPlot(treeData);

    let speciesInput = d3.select('#species');
    speciesInput.on('keyup', function() {
        d3.select("#species").html(this.value);
        let searchText = this.textContent.toLowerCase();
        let filteredData;
        filteredData = treeData.filter( d => d.species.includes(searchText));
        drawTreeScatterPlot(filteredData);
    });
}

function drawTreeScatterPlot(treeData) {
    //console.log(treeData);
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
        .attr('r', 2)
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
