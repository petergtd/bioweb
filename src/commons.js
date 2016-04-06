import * as d3 from "d3";
import $ from 'jquery';
import _ from 'lodash';

function getUIRefData(){
  function handleResponse(data){

    $('#obs_version').append(function(){
      var html = '';
      _(data.observed).forEach(function(value){
        html += '<option value="' + value + '">' + value + '</option>';
      });
      return html;
    });

    $('#calc_version').append(function(){
      var html = '';
      _(data.calculated).forEach(function(value){
        html += '<option value="' + value + '">' + value + '</option>';
      });
      return html;
    });
  }

  $.ajax({
      url: 'api/phenotypeUIRefData',
      fail: function(err){console.log(err);},
      success: handleResponse,
      dataType: 'json'
  });
}

$('#phenChart').on('submit', function(e){
  e.preventDefault();
  var obsVersion = $('#obs_version').val();
  var calcVersion = $('#calc_version').val();

  getAllPhenotypeData(obsVersion, calcVersion);

});

function getAllPhenotypeData(obsVersion, calcVersion){


  function createChartContainers(phenotypeData){

    $('#chartContainer').html('');

    _(phenotypeData).forOwn(function(cv, key){
      $('#chartContainer').append('<h2>' + key + '</h2>' +
        '<div id="' + key + '_Chart" class="traitChart">' +
        '</div>'
      );
    });
  }

  function createChartStatisticsTable(traitData, traitKey){

    $("#" + traitKey + "_Chart").append('<h2> Statistics for ' + traitKey + '</h2>' +
      '<table id="' + traitKey + '_Chart" class="traitChart">' +
        '<tr><th colspan="2">Not Observed</th><th colspan="1">Observed</th></tr>' +
        '<tr>' +
          '<td class="statLabelCell">Count</td>' +
          '<td id="' + traitKey + '_totalNotObserved" class="statValueCell"></td>' +
          '<td id="' + traitKey + '_totalObserved" class="statValueCell"></td>' +
        '</tr>' +
        '<tr>' +
          '<td class="statLabelCell">Std Dev</td>' +
          '<td id="' + traitKey + '_notObservedStdDev" class="statValueCell"></td>' +
          '<td id="' + traitKey + '_observedStdDev" class="statValueCell"></td>' +
        '</tr>' +
        '<tr>' +
          '<td class="statLabelCell">Mean</td>' +
          '<td id="' + traitKey + '_notObservedMeanScore" class="statValueCell"></td>' +
          '<td id="' + traitKey + '_observedMeanScore" class="statValueCell"></td>' +
        '</tr>' +
        '<tr>' +
          '<td class="statLabelCell">Median</td>' +
          '<td id="' + traitKey + '_notObservedMedianScore" class="statValueCell"></td>' +
          '<td id="' + traitKey + '_observedMedianScore" class="statValueCell"></td>' +
        '</tr>' +
      '</table>'
    );

    _(traitData).forOwn(function(cv, key){
      $("#" + traitKey + "_" + key).append(cv);
    });
  }

  function handleResponse(data){
    let result  = {};

    _(data.plotData).forOwn(function(trait, traitKey){
      let traitCollection = [];
      _(trait).forOwn(function(cv){
        traitCollection.push(cv);
      });
      result[traitKey] = traitCollection;
    });

    console.log(data.allScoresByTrait);

    createChartContainers(result);

    _(result).forOwn(function(cv, key) {
      buildChart(cv, key);
    });

    _(data.traitStatistics).forOwn(createChartStatisticsTable);

  }

  console.log('api/phenotypedata?obsVersion=' + obsVersion +  '&calcVersion=' + calcVersion);

  $.ajax({
      url: 'api/phenotypedata?obsVersion=' + obsVersion +  '&calcVersion=' + calcVersion,
      fail: function(err){console.log(err);},
      success: handleResponse,
      dataType: 'json',
  });
}

getUIRefData();

function buildChart(traitData, traitName){

  var margin = {top: 20, right: 20, bottom: 30, left: 40},
      width = 400 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

  var x = d3.scale.linear()
      .range([0, width]);

  var y = d3.scale.linear()
      .range([height, 0]);

  var color = d3.scale.category10();

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");

  var svg = d3.select("#" + traitName + "_Chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // data.forEach(function(d) {
  //   d.sepalLength = +d.sepalLength;
  //   d.sepalWidth = +d.sepalWidth;
  // });

  // x.domain(d3.extent(data, function(d) { return d.traitObserved; })).nice();
  x.domain([-1, 2]).nice();
  y.domain(d3.extent(traitData, function(d) { return d.traitScore; })).nice();

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
    .append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Trait Observed");

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Calculated Score");

  svg.selectAll(".dot")
      .data(traitData)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", 3.5)
      .attr("cx", function(d) { return x(d.traitObserved); })
      .attr("cy", function(d) { return y(d.traitScore); })
      .style("fill", function(d) { return color(d.count); });

  var legend = svg.selectAll(".legend")
      .data(color.domain())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color);

  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });

}
