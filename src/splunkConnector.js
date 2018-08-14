(function () {
    // Create the connector object
    var myConnector = tableau.makeConnector();

    // Search everything and return the first 10 results
    var searchQuery = "search index=_internal | head 10 | table host, source, sourcetype";

    // Set the search parameters--specify a time range
    var searchParams = {
       output_mode: "JSON",
       earliest_time: "-24h@h",
       latest_time: "now"
    };

    var http = new splunkjs.JQueryHttp();

    // Define Variables for Splunk Instance
    var _user             = "admin";
    var _pass             = "password";
    var _schema           = "https";
    var _host   	        =  "hostname.tld";
    var _management_port 	= "8089"
    var _version 	        = "7.1.1";

    // Create a Service instance and log in
    var service = new splunkjs.Service(http, {
      username: _user,
      password: _pass,
      scheme: _schema,
      host: _host,
      port: _management_port,
      version:_version
    });


    // Debug: Append Debug Logs
    $('.log').append("\nSPL: " + searchQuery + "\n" );
    $('.log').append("Username: " + _user + "\n" );
    $('.log').append("Password: " +_pass + "\n" );
    $('.log').append("Schema: " + _schema + "\n" );
    $('.log').append("Host: " +_host + "\n" );
    $('.log').append("Management Port: " +_mgmt_port + "\n" );
    $('.log').append("Version: " +_version + "\n" );



    // List savedSearch
    // listSavedSearch(service);

    // Run savedSearches
    // executeSavedSearch(service, "Messages by minute last 3 hours");



    // Define the schema
    myConnector.getSchema = function (schemaCallback) {

        var cols = [{
            id: "host",
            alias: "Host",
            dataType: tableau.dataTypeEnum.string
          },{
            id: "source",
            alias: "Source",
            dataType: tableau.dataTypeEnum.string
          },{
            id: "sourcetype",
            alias: "Source Type",
            dataType: tableau.dataTypeEnum.string
        }];

        var tableInfo = {
            id: "splunkFeed",
            alias: "Splunk Feed Test",
            columns: cols
        };

        schemaCallback([tableInfo]);
    };

    // Download the data
    myConnector.getData = function (table, doneCallback) {

      var fetchSplunkData = new Promise(function(resolve,reject){
      var tableData = [];

            // Run a oneshot search that returns the job's results
            service.oneshotSearch(
               searchQuery,
               searchParams,
               function(err, response) {
                   res = response.results;
		               console.log(res); //
                   for (var i=0; i<res.length; ++i) {
                     tableData.push({
                         "host": res[i].host,
                         "source": res[i].source,
                         "sourcetype": res[i].sourcetype
                     });
                   }
                   resolve(tableData);
                });
            });

            Promise.all([fetchSplunkData]).then(function(data){
                table.appendRows(data[0]);
                doneCallback();
            });
      };
      tableau.registerConnector(myConnector);

      // Create event listeners for when the user submits the form
      $(document).ready(function () {
        $("#submitButton").click(function () {
          tableau.connectionName = "Splunk Feed"; // This will be the data source name in Tableau
          tableau.submit(); // This sends the connector object to Tableau
        });
      });
})();


// Function to list all the splunk saved searches
function listSavedSearch(service){
  // List all saved searches for the current username
  var mySavedSearches = service.savedSearches();
  mySavedSearches.fetch(function(err, mySavedSearches) {
      console.log("There are " + mySavedSearches.list().length + " saved searches");
      var savedSearchColl = mySavedSearches.list();
      for(var i = 0; i < savedSearchColl.length; i++) {
          var search = savedSearchColl[i];
          console.log(i + ": " + search.name);
          console.log("    Query: " + search.properties().search + "\n");
      }
  });
}


// Function to execute splunk saved search on given searchName
function executeSavedSearch(service, searchName){

  // Retrieve the saved search collection
  var mySavedSearches = service.savedSearches();

  mySavedSearches.fetch(function(err, mySavedSearches) {

    // Retrieve the saved search that was created earlier
    var mySavedSearch = mySavedSearches.item(searchName);

    // Run the saved search and poll for completion
    mySavedSearch.dispatch(function(err, job) {

      // Display the job's search ID
      console.log("Job SID: ", job.sid);

      // Poll the status of the search job
      job.track({
        period: 200
      }, {
        done: function(job) {
          console.log("Done!");

          // Print out the statics
          console.log("Job statistics:");
          console.log("  Event count:  " + job.properties().eventCount);
          console.log("  Result count: " + job.properties().resultCount);
          console.log("  Disk usage:   " + job.properties().diskUsage + " bytes");
          console.log("  Priority:     " + job.properties().priority);

          // Get 10 results and print them
          job.results({
            count: 10
          }, function(err, results, job) {
            console.log(JSON.stringify(results));
          });
        },
        failed: function(job) {
          console.log("Job failed")
        },
        error: function(err) {
          done(err);
        }
      });
    });
  });
}
