

$("#SavedSearchDropDown").change(function () {
        console.log($("#SavedSearchDropDown option:selected").attr('title'));
});

$("#SearchHeadConfigButton").click(function () {
  $('#SavedSearchDropDown option:selected').attr("title");

  var _user             = "admin";
  var _pass             = "Chang3d!";
  var _schema           = "https";
  var _host   	        =  "tableau.splunk.link";
  var _management_port 	= "8089"




});

// Create a Service instance via Splunk JS
function createServiceInstance() {
  // Retrieve data from UI
  var _host   	        = $('input[name="hostname"]').val();
  var _user             = $('input[name="username"]').val();
  var _pass             = $('input[name="password"]').val();
  var _schema           = $('#schema option:selected').val();
  var _management_port 	= $('input[name="management_port"]').val();

  // Create a Service instance
  var http = new splunkjs.JQueryHttp();
  var service = new splunkjs.Service(http, {
    host: _host,
    username: _user,
    password: _pass,
    scheme: _schema,
    port: _management_port
  });

  return service;
}

// Handle click event for Test Connection button
$('button[name="sh-test-connection"]').click(function(){

  // new service instance
  var service = new createServiceInstance();

  // Retrieve Splunk Version to Test Connection
  var isSuccessful = false;
  service.serverInfo(function(err, info) {
     try {
        console.log("Splunk Version: ", info.properties().version);
        isSuccessful = true;
        $('.connectionSuccessful').addClass('show');
        $('.connectionSuccessful').html("[-] Connected to Splunk Version: " + info.properties().version);

        // List savedSearch
        listSavedSearch(service);
        $('.connectionSuccessful').append("<br>[-] Populated SavedSearch");


      }
      catch(err){
        console.log(err);
        console.log('err');
        $('.connectionError').addClass('show');
        $('.connectionError').html("Failed! Verify entered server details.");
     }
  });

  // Catch jQuery POST error
  setTimeout(function(){
    if(isSuccessful == false) {
      console.log('Error timeout');
      $('.connectionError').addClass('show');
      $('.connectionError').html("Failed! Verify entered server details.");
    }
  }, 3000);

});

$('button[name="sh-next"]').click(function(){
    $(".nav-link:nth-child(1)").click();
});


(function () {

    var isPaused  = false;
    var cols      = [];
    var res       = null;
    // Create the connector object
    var myConnector = tableau.makeConnector();

    // Search everything and return the first 10 results
    var searchQuery = "search index=main | head 10 | table host, source, sourcetype, _time";

    // Set the search parameters--specify a time range
    var searchParams = {
       output_mode: "JSON",
       earliest_time: "-24h@h",
       latest_time: "now"
    };


    // Define Variables for Splunk Instance
    var _user             = "admin";
    var _pass             = "Chang3d!";
    var _schema           = "https";
    var _host   	        =  "tableau.splunk.link";
    var _management_port 	= "8089";

    // Create a Service instance and log in
    var http = new splunkjs.JQueryHttp();
    var service = new splunkjs.Service(http, {
      username: _user,
      password: _pass,
      scheme: _schema,
      host: _host,
      port: _management_port
    });



    // Define the schema
     myConnector.getSchema = function (schemaCallback) {
       var tableData = [];
       // Splunk JS SDK Calls...
       service.oneshotSearch(
          searchQuery,
          searchParams,
          function(err, response) {
              res = response.results;
              console.log(res); //
              for (var i=0; i<res.length; ++i) {
                  if(i==0){
                    Object.keys(res[i]).forEach(function(key) {
                         console.log('Key : ' + key + ', Value : ' + res[i][key]);
                         cols.push( { id: key, alias: key, dataType: tableau.dataTypeEnum.string } );
                     });
                   }
                   else {
                      continue;
                   }
              }
              // Tableau Column Schema JS SDK Calls...
              var tableInfo = {
                 id: "splunkFeed",
                 alias: "Splunk Feed Test",
                 columns: cols
             };
             schemaCallback([tableInfo]);
              // resolve(tableData);
           });
    };


     // Download the data

    myConnector.getData = function (table, doneCallback) {
      var fetchSplunkData = new Promise(function(resolve,reject){
      var tableData = []; 
              console.log(res); //
              for (var i=0; i<res.length; ++i) {
                  console.log('this should execute');
                  isPaused = false;
                  tableData.push(res[i]);
              }
              resolve(tableData); 
            }); 
            Promise.all([fetchSplunkData]).then(function(data){
                table.appendRows(data[0]);
                doneCallback();
            });
      };


     // tableau.registerConnector(myConnector);

      // Create event listeners for when the user submits the form
      $(document).ready(function () {
        // Refresh SavedSearch
        $("#refreshButtonSavedSearch").click(function () {
          // new service instance
          var service = new createServiceInstance();
          listSavedSearch(service);
        });

        // Submit SavedSearch
        $("#submitButtonSavedSearch").click(function () {  
          // new service instance
          var service = new createServiceInstance();
          var savedSearchName  = $("#SavedSearchDropDown option:selected").val();
          executeSavedSearch(service, savedSearchName)
        });

        // Submit Custom SPL
        $("#submitButtonSPL").click(function () {  
          // new service instance
          var service = new createServiceInstance();
          var searchQuery = $("#SPLTextArea").val();
          executeSPL(service, searchQuery);
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
      var $dropdownSS = $("#SavedSearchDropDown");
      $dropdownSS.html("");
      for(var i = 0; i < savedSearchColl.length; i++) {
          var search = savedSearchColl[i];
          console.log(i + ": " + search.name);
          console.log("    Query: " + search.properties().search + "\n");

          // Polulate drop down with result of SavedSearch
          $dropdownSS.append($("<option />").val(search.name).text(search.name).attr( "title", search.properties().search ));
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
            // console.log(results.fields);


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


function executeSPL(service, searchQuery){
  // Eliminating meta fields data in output
  searchQuery = searchQuery + " | fields - _bkt, _cd, _indextime, _raw, _si, _subsecond, _sourcetype, splunk_server, linecount, component, 
punct | fields *"

  // Maximum records Search would return
  var max_record_limit = 10000;

  // Set the search parameters
  var searchParams = {
    exec_mode: "blocking",
    output_mode: "JSON"
  };


  var isPaused  = false;
  var cols      = [];
  var res       = null;
  

  // Create the connector object
  var myConnector = tableau.makeConnector();

  // A blocking search returns the job's SID when the search is done
  console.log("Wait for the search to finish...");

  // Define the schema
  myConnector.getSchema = function (schemaCallback) {
      var tableData = [];
      // Splunk JS SDK Calls...
      service.search(
        searchQuery,
        searchParams,
        function(err, job) {
          console.log("...done!\n");
    
          // Get the job from the server to display more info
          job.fetch(function(err){
            // Display properties of the job
            console.log("Search job properties\n---------------------");
            console.log("Search job ID:         " + job.sid);
            console.log("The number of events:  " + job.properties().eventCount);
            console.log("The number of results: " + job.properties().resultCount);
            console.log("Search duration:       " + job.properties().runDuration + " seconds");
            console.log("This job expires in:   " + job.properties().ttl + " seconds");
    
            // Get the results and display them
            job.results({count: max_record_limit, output_mode: "JSON"}, function(err, results) {
              console.log(results.results);
              var res = results.results;
              for (var i=0; i<res.length; ++i) {
                if(i==0){
                  Object.keys(res[i]).forEach(function(key) {
                      console.log('Key : ' + key + ', Value : ' + res[i][key]);
                      cols.push( { id: key, alias: key, dataType: tableau.dataTypeEnum.string } );
                  });
                }
                else {
                    continue;
                }
              }

              // Tableau Column Schema JS SDK Calls...
                var tableInfo = {
                  id: "splunkFeed",
                  alias: "Splunk Feed Test",
                  columns: cols
              };

              schemaCallback([tableInfo]);
            })
    
          });
    
        }
      );

 
   };
  
  // Sync data received from Splunk to Tableau
  myConnector.getData = function (table, doneCallback) {
     var fetchSplunkData = new Promise(function(resolve,reject){
     var tableData = [];
          console.log(res);
          for (var i=0; i<res.length; ++i) {
              console.log('this should execute');
              isPaused = false;
              tableData.push(res[i]);
          }
          resolve(tableData); 
      });
  
      Promise.all([fetchSplunkData]).then(function(data){
          table.appendRows(data[0]);
          doneCallback();
      });
  };
  
  tableau.registerConnector(myConnector);

  tableau.connectionName = "Splunk Feed";  
      tableau.submit();  
      /*
    setTimeout(() => {
      tableau.connectionName = "Splunk Feed";  
      tableau.submit();  
    }, 5000);
  */
}

