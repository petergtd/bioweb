import common from './commons';

var trait = getQueryVariable('trait');

getTraitRsidScores(trait || 'acne');

function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1];}
       }
       return(false);
}

function getTraitRsidScores(trait){

  function createChartContainer(traitData){

    $('#chartContainer').html('');

    $('#chartContainer').append('<h2>' + trait + '</h2>' +
      '<div id="' + trait + '_Chart" class="traitChart">' +
      '</div>'
    );
  }

  function handleResponse(traitData){

    createChartContainer(traitData);
    buildChart(traitData, trait);

  }

  $.ajax({
      url: 'api/trait_rsid_count?trait=' + trait ,
      fail: function(err){console.log(err);},
      success: handleResponse,
      dataType: 'json',
  });
}

function buildChart(traitData, traitName){

  var margin = {top: 20, right: 20, bottom: 30, left: 40},
      width = 800 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var x = d3.scale.ordinal()
      // .range([0, width]);
      .rangeBands([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  // var color = d3.scale.category10();

  var xAxis = d3.svg.axis()
      .scale(x)
      .tickValues([])
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var svg = d3.select("#" + traitName + "_Chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  //var traitRsidValues = traitData.map(function (cv) { return cv.rsid; });

  x.domain(traitData.map(function (cv) { return cv.rsid; }));
  y.domain(d3.extent(traitData, function(d) { return d.count; })).nice();

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("x", width - 4)
      .attr("y", 12)
      .style("text-anchor", "end")
      .text("RSIDs Found");

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("RSID Occurrence Count");

  svg.selectAll(".dot")
      .data(traitData)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", function(d) { return x(d.rsid); })
      .attr("cy", function(d) { return y(d.count); })
      .style("fill", "lightblue")
      .append("svg:title")
      .text(function(d) { return 'RSID ' + d.rsid + ' was found ' + d.count + ' times' ; });

  // var legend = svg.selectAll(".legend")
  //     .data(color.domain())
  //   .enter().append("g")
  //     .attr("class", "legend")
  //     .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
  //
  // legend.append("rect")
  //     .attr("x", width - 18)
  //     .attr("width", 18)
  //     .attr("height", 18)
  //     .style("fill", color);
  //
  // legend.append("text")
  //     .attr("x", width - 24)
  //     .attr("y", 9)
  //     .attr("dy", ".35em")
  //     .style("text-anchor", "end")
  //     .text(function(d) { return d; });

}
