
// Runs at page load
(function () {

    var cols                = [];                                           // Tableau Column definition
    var res                 = null;                                         // Response Handler
    var max_record_limit    = 50000;                                        // Max record splunk would return in one go. (max is 50K)
    var myConnector         = new tableau.makeConnector();                  // Create the connector object

    // returns array of SPL Query string and Auth string
    _params = lzw_decode(b64DecodeUnicode(window.location.href.split("?")[1].split("query=")[1])).split("[-][-][-]");

    log(_params);
    if(_params[0].indexOf("datamodel")  >=0 ){
        var searchQuery     = " "
                            + _params[0]
                            + " | fields - _bkt, _cd, _indextime, _si, _sourcetype, _subsecond, linecount, splunk_server "
                            + "";                                           // Build search Query  i.e. "search index=_internal | head 1000 | table host, source, sourcetype, _time"
    }else{
        var searchQuery     = "search "
        + _params[0]
        + " | fields - _bkt, _cd, _indextime, _si, _sourcetype, _subsecond, linecount, splunk_server "
        + "";
    }


    var auth            = JSON.parse(_params[1]);                           // Parse JSON object from Stringified Auth details string
    var cName           = _params[2];                                       // Connection Name


    // Set the search parameters--specify a time range
    var searchParams = {
        exec_mode: "blocking",
        output_mode: "JSON"
    };

    // Using /proxy to bypass CORS and SSL validation
    // var http           = new splunkjs.JQueryHttp();
    var http            = new splunkjs.ProxyHttp("https://tableau-wdc.splunk.link/proxy");
    var service         = new splunkjs.Service(http, auth);

    // Populate UI
    auth["password"]    = auth["password"].replace(/./g, '*');                   // Mask Password
    $(".input-information").append("[-] <b>Type:</b> " + cName);   // Add Auth
    $(".input-information").append("\n\r[-] <b>SPL:</b> " + _params[0].replace(/\|/g,"\n\t\|"));             // Add SPL
    $(".input-information").append("\n\r[-] <b>Auth:</b> " + JSON.stringify(auth).replace(/",/g,'",\n\t\t').replace(/({|})/g,"") );   // Add Auth


    // Define the schema
    myConnector.getSchema = function (schemaCallback) {
        var tableData = [];
        // Splunk JS SDK Calls...
        log("...getSchema!");

        service.search(
            searchQuery,
            searchParams,
            function(err, job) {
                log("...done!\n");
                if (err){
                    // Error Handling
                    log(err);
                    log(err_message);
                    var err_message = err["data"]["messages"][0]["text"];

                    // Update UI with an error
                    $('.connectionError').addClass('show');
                    $('.connectionError').html("SPLUNKD: " + err_message );

                    // Add column structure to handle error when Tableau receives response
                    cols.push( { id: "id", alias: "id", dataType: tableau.dataTypeEnum.string } );
                    cols.push( { id: "message", alias: "message", dataType: tableau.dataTypeEnum.string } );

                    res = [{"id" : "splunkd", "message" : err_message }]

                    // Tableau Column Schema JS SDK Calls...
                    var tableInfo = {
                        id: "splunkError",
                        alias: "Message from SplunkD",
                        columns: cols
                    };
                    schemaCallback([tableInfo]);

                }
                else{
                    // Get the job from the server to display more info
                    job.fetch(function(err){
                        // Display properties of the job
                        log("Search job properties\n---------------------");
                        log("Search job ID:         " + job.sid);
                        log("The number of events:  " + job.properties().eventCount);
                        log("The number of results: " + job.properties().resultCount);
                        log("Search duration:       " + job.properties().runDuration + " seconds");
                        log("This job expires in:   " + job.properties().ttl + " seconds");

                        // Error Handling: If Search returned 0 result.
                        if(job.properties().eventCount == 0){
                            // Add column structure to handle error when Tableau receives response
                            cols.push( { id: "id", alias: "id", dataType: tableau.dataTypeEnum.string } );
                            cols.push( { id: "message", alias: "message", dataType: tableau.dataTypeEnum.string } );
                            cols.push( { id: "spl_used", alias: "spl", dataType: tableau.dataTypeEnum.string } );

                            res = [{"id" : "splunkd", "message" : "The number of events: 0", "spl_used" : _params[0]  }]

                            // Tableau Column Schema JS SDK Calls...
                            var tableInfo = {
                                id: "splunkError",
                                alias: "Message from Splunk Search",
                                columns: cols
                            };
                            schemaCallback([tableInfo]);

                        }else{
                            // Get the results and display them
                            job.results({count: max_record_limit, output_mode: "JSON"}, function(err, results) {
                                // log(results.results);
                                res = results.results;
                                // log("Response Length: "  + res.length);

                                // Extract Column names from first event
                                // (This phase will help us define schema, rest of the entries in "res/result"  will be processed by getData)
                                Object.keys(res[0]).forEach(function(key) {
                                    log('Key : ' + key + ', Value : ' + res[0][key]);
                                    cols.push( { id: key, alias: key, dataType: tableau.dataTypeEnum.string } );
                                });

                                // Tableau Column Schema JS SDK Calls...
                                var tableInfo = {
                                    id: "splunkFeed",
                                    alias: cName, // "Splunk Feed Test",
                                    columns: cols
                                };

                                schemaCallback([tableInfo]);
                            });
                        }
                    });
                }
            });
    };


    // Process "res/result" the data
    myConnector.getData = function (table, doneCallback) {
        var fetchSplunkData = new Promise(function(resolve,reject){
            var tableData = [];
            // log(res.length);
            for (var i=0; i<res.length; ++i) {
                tableData.push(res[i]);
            }
            resolve(tableData);
        });
        Promise.all([fetchSplunkData]).then(function(data){
            table.appendRows(data[0]);
            doneCallback();
        });
    };

    log("registerConnector");
    tableau.registerConnector(myConnector);

    // Submit Data back to Tableau
    $("#submitToTableauButton").click(function () {
        log("submitToTableauButton");
        tableau.connectionName = cName; // "Splunk Feed";
        tableau.submit();
        });

})();
