var express = require('express');
var _ = require('lodash');
var math = require('mathjs');
var app = express();

var pg = require('pg');
var conString = process.env.dbConn || "postgres://postgres:postgres@104.197.193.93/postgres";

app.use('/builds', express.static(__dirname + '/builds'));
app.use('/', express.static(__dirname + '/public'));

app.get('/api/trait_rsid_count', function(req, res) {

    pg.connect(conString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        var traitRows = [];
        // var traitData = {};

        var traitRsidCountQuery  = client.query({
          text: "SELECT rsid, count FROM rsid_counts WHERE trait = $1",
          values: [req.query.trait]
        });

        traitRsidCountQuery.on('row', function(row) {
              traitRows.push(row);
        });

        traitRsidCountQuery.on('end', function() {
            done();
            return res.json(traitRows);
        });
    });
});


app.get('/api/phenotypeUIRefData', function(req, res) {

    pg.connect(conString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        var refDataRows = [];
        var refData = {};

        var refDataQuery = client.query("SELECT datacategory, version FROM phenotypeb GROUP BY datacategory, version");
        refDataQuery.on('row', function(row) {
              refDataRows.push(row);
        });

        refDataQuery.on('end', function() {
            done();
            _(refDataRows).forEach(function(value, key){
              if(!refData[value.datacategory]){
                refData[value.datacategory] = [value.version];
              }
              else {
                refData[value.datacategory].push(value.version);
              }
            });

            return res.json(refData);
        });

    });
});

// Test URL: /api/phenotypedata?obsVersion=cagi&calcVersion=rsmultb0
app.get('/api/phenotypedata', function(req, res) {

    var observedRowData = [];
    var scoreRowData = [];
    var scoreObj = {};
    var rawTraitData = {};
    var traitStatistics = {};

    // Get a Postgres client from the connection pool
    pg.connect(conString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }

        //var scoreQuery = client.query("SELECT * FROM phenotypeb WHERE datacategory = 'calculated' AND huid IN ('hu011C57','hu016B28','hu0211D6','hu025CEA')");
        var scoreQuery = client.query({
          text: "SELECT * FROM phenotypeb WHERE datacategory = 'calculated' AND version = $1 AND huid IN (SELECT DISTINCT huid FROM phenotypeb WHERE datacategory = 'observed')",
          values: [req.query.calcVersion]
        });
        scoreQuery.on('row', function(row) {
              scoreRowData.push(row);
        });

        scoreQuery.on('end', function() {
          done();
          scoreObj = _.keyBy(scoreRowData,'huid');

          // SQL Query > Select Data
          //var observedQuery = client.query("SELECT * FROM phenotypeb WHERE datacategory = 'observed' AND huid IN ('hu011C57','hu016B28','hu0211D6','hu025CEA')");
          var observedQuery = client.query({
            text: "SELECT * FROM phenotypeb WHERE datacategory = 'observed' AND version = $1 AND huid IN (SELECT DISTINCT huid FROM phenotypeb WHERE datacategory = 'calculated')",
            values: [req.query.obsVersion]
          });

          // Stream results back one row at a time
          observedQuery.on('row', function(row) {
              observedRowData.push(row);
          });

          // After all data is returned, close connection and return results
          observedQuery.on('end', function() {
              done();

              var plotData = {};
              observedRowData.forEach(function(cv) {
                // Lookup the cooresponding rsid score for the individual (cv).
                _.forOwn(cv, function(value, key) {

                  // Ignore huid or datacategory properties
                  if (key === 'huid' || key === 'datacategory' || key === 'version') { return; }

                  // Get a referenence to the calculated score for the given huid and phenotypic trait (hey)
                  var currentScoreValue = scoreObj[cv.huid][key];

                  // If it's the first time we're seeing this trait, create a property for it, initially defined as an empty object.
                  if (typeof plotData[key] == 'undefined') {
                    plotData[key] = {};
                  }

                  // If it's the first time we're seeing a given 'calculated score' and 'observed value' combination, create an object for that combo.
                  if (typeof plotData[key][currentScoreValue + '_' + value]  == 'undefined') {
                    plotData[key][currentScoreValue + '_' + value] = {
                      'traitObserved': value,
                      'traitScore': currentScoreValue,
                      'count': 1,
                    };
                  }
                  // Assuming we've already created an object for a given score and observation value, increment the counter for that object.
                  else {
                    plotData[key][currentScoreValue + '_' + value].count++;
                  }

                  if (typeof rawTraitData[key] == 'undefined') {
                    rawTraitData[key] = {};
                  }

                  rawTraitData[key][cv.huid] = {
                    traitObserved: value,
                    traitScore: currentScoreValue,
                  };

                  // Initialize base properties of traitStatistics
                  if (typeof traitStatistics[key] == 'undefined') {
                    traitStatistics[key] = {};
                  }
              });
            });

            _(rawTraitData).forOwn(function(traitData, key){
              var allTraitScores = [];
              var allTraitObservations = [];
              var observedScores = [];
              var notObservedScores = [];

              _(traitData).forOwn(function(huid){
                if(huid.traitObserved === 1){
                  observedScores.push(huid.traitScore);
                } else {
                  notObservedScores.push(huid.traitScore);
                }

                // console.log(huid.traitScore);
                allTraitScores.push(huid.traitScore);
                allTraitObservations.push(huid.traitObserved);

              });

              var traitItem = traitStatistics[key];

              traitItem.totalObserved = observedScores.length;
              traitItem.totalNotObserved = notObservedScores.length;

              traitItem.observedStdDev = traitItem.totalObserved === 0 ? 'N/A' : math.std(observedScores).toFixed(3);
              traitItem.notObservedStdDev = traitItem.totalNotObserved === 0 ? 'N/A' : math.std(notObservedScores).toFixed(3);
              traitItem.observedMeanScore = traitItem.totalObserved === 0 ? 'N/A' : math.mean(observedScores).toFixed(3);
              traitItem.notObservedMeanScore = traitItem.totalNotObserved === 0 ? 'N/A' : math.mean(notObservedScores).toFixed(3);
              traitItem.observedMedianScore = traitItem.totalObserved === 0 ? 'N/A' : math.median(observedScores).toFixed(3);
              traitItem.notObservedMedianScore = traitItem.totalNotObserved === 0 ? 'N/A' : math.median(notObservedScores).toFixed(3);
            });

            return res.json({
              plotData: plotData,
              traitStatistics: traitStatistics,
            });
        });
    });
});
});

app.listen(process.env.PORT || 3000, function () {
  console.log('Example app listening on port 3000!');
});
