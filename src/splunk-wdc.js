// Runs at page load
(function () {

    var cols = []; // Tableau Column definition
    var res = []; // Response Handler
    var max_record_limit = 10000; // Max record splunk would return in one go. (max is 50K)
    var myConnector = new tableau.makeConnector(); // Create the connector object
    var fields = {}; // Response field types dictionary

    // returns array of SPL Query string and Auth string
    _params = lzw_decode(b64DecodeUnicode(window.location.href.split("?")[1].split("query=")[1])).split("[-][-][-]");

    log(_params);
    if (_params[0].indexOf("datamodel") >= 0) {
        var searchQuery = " " +
            _params[0] +
            " | fields - _bkt, _cd, _indextime, _si, _sourcetype, _subsecond, linecount, splunk_server " +
            ""; // Build search Query  i.e. "search index=_internal | head 1000 | table host, source, sourcetype, _time"


    } else if (_params[0].indexOf("|") < 4 && _params[0].indexOf("|") != -1) {
        var searchQuery = " " +
            _params[0] +
            " | fields - _bkt, _cd, _indextime, _si, _sourcetype, _subsecond, linecount, splunk_server " +
            "";
    } else {
        var searchQuery = "search " +
            _params[0] +
            " | fields - _bkt, _cd, _indextime, _si, _sourcetype, _subsecond, linecount, splunk_server " +
            "";
    }


    var auth = JSON.parse(_params[1]); // Parse JSON object from Stringified Auth details string
    var cName = _params[2]; // Connection Name


    // Set the search parameters--specify a time range
    var searchParams = {
        exec_mode: "blocking",
        output_mode: "JSON"
    };

    if (_params[4] == "proxy=disabled") {
        var http = new splunkjs.JQueryHttp();
    } else {
        // Using /proxy to bypass CORS and SSL validation
        var http = new splunkjs.ProxyHttp("/proxy");
    }

    var service = new splunkjs.Service(http, auth);

    // Populate UI
    $(".input-information").append("[-] <b>Type:</b> " + cName); // Add Auth
    $(".input-information").append("\n\r[-] <b>SPL:</b> " + _params[0].replace(/\|/g, "\n         \|")); // Add SPL
    
    if (auth['password'] != undefined) {
        auth["password"] = auth["password"].replace(/./g, '*'); // Mask Password
    } else if (auth['sessionKey'] != undefined) {
        auth["sessionKey"] = auth["sessionKey"].replace(/./g, '*'); // Mask Token
    }
    
    $(".input-information").append("\n\r[-] <b>Auth:</b> " + JSON.stringify(auth).replace(/",/g, '",\n\t\t').replace(/({|})/g, "")); // Add Auth

    // Define the schema
    myConnector.getSchema = function (schemaCallback) {
        var tableData = [];
        // Splunk JS SDK Calls...
        log("...getSchema!");

        service.search(
            searchQuery,
            searchParams,
            function (err, job) {
                log("...done!\n");
                if (err) {
                    // Error Handling
                    log(err);
                    log(err_message);
                    var err_message = err["data"]["messages"][0]["text"];

                    // Update UI with an error
                    $('.connectionError').addClass('show');
                    $('.connectionError').html("SPLUNKD: " + err_message);

                    // Add column structure to handle error when Tableau receives response
                    cols.push({
                        id: "id",
                        alias: "id",
                        dataType: tableau.dataTypeEnum.string
                    });
                    cols.push({
                        id: "message",
                        alias: "message",
                        dataType: tableau.dataTypeEnum.string
                    });

                    res = [{
                        "id": "splunkd",
                        "message": err_message
                    }]

                    // Tableau Column Schema JS SDK Calls...
                    var tableInfo = {
                        id: "splunkError",
                        alias: "Message from SplunkD",
                        columns: cols
                    };
                    schemaCallback([tableInfo]);

                } else {
                    // Get the job from the server to display more info
                    job.fetch(function (err) {
                        // Display properties of the job
                        log("Search job properties\n---------------------");
                        log("Search job ID:         " + job.sid);
                        log("The number of events:  " + job.properties().eventCount);
                        log("The number of results: " + job.properties().resultCount);
                        log("Search duration:       " + job.properties().runDuration + " seconds");
                        log("This job expires in:   " + job.properties().ttl + " seconds");

                        // Error Handling: If Search returned 0 result.
                        if (job.properties().eventCount == -1) {

                            log(job.properties());
                            // Add column structure to handle error when Tableau receives response
                            cols.push({
                                id: "id",
                                alias: "id",
                                dataType: tableau.dataTypeEnum.string
                            });
                            cols.push({
                                id: "message",
                                alias: "message",
                                dataType: tableau.dataTypeEnum.string
                            });
                            cols.push({
                                id: "spl_used",
                                alias: "spl",
                                dataType: tableau.dataTypeEnum.string
                            });

                            res = [{
                                "id": "splunkd",
                                "message": "The number of events: 0, try to tweak SPL or check browser console for debugging.",
                                "spl_used": _params[0]
                            }]

                            // Tableau Column Schema JS SDK Calls...
                            var tableInfo = {
                                id: "splunkError",
                                alias: "Message from Splunk Search",
                                columns: cols
                            };

                            schemaCallback([tableInfo]);

                        } else {

                            // Page through results by looping through sets of 10K at a time
                            var resultCount = job.properties().resultCount; // Number of results this job returned
                            var myOffset = 0; // Start at result 0
                            // var max_record_limit;                        // Defined globally, Helps get sets of 10K results at a time

                            log("aync stats");
                            // Run an asynchronous while loop using the Async.whilst helper function to
                            // loop through each set of results 
                            splunkjs.Async.whilst(

                                // Condition--loop while there are still results to display
                                function () {
                                    return (myOffset < resultCount);
                                },

                                // Body--display each set of results
                                function (done) {

                                    // Get the results and display them  {count: max_record_limit,offset:myOffset}
                                    job.results({
                                        count: max_record_limit,
                                        offset: myOffset,
                                        output_mode: "JSON"
                                    }, function (err, results) {
                                        // log(results.results);
                                        log("[-] fetching result set");
                                        //res = ;
                                        res = res.concat(results.results);
                                        // During the last fetch...
                                        // Extract Column names from first event
                                        // (This phase will help us define schema, rest of the entries in "res/result"  will be processed by getData)
                                        if (myOffset >= (resultCount - max_record_limit)) {


                                            log("Response type: " + typeof (res));
                                            log("Response[0] type: " + typeof (res[0]));
                                            log("Response[0]: ");
                                            log(res[0]);



                                            log("added colum definition");
                                            Object.keys(res[0]).forEach(function (key) {
                                                log('Key : ' + key + ', Value : ' + res[0][key]);

                                                if ( res[0][key].match(/^-?\d+$/) ) {

                                                    // Integer column definition (int)
                                                    cols.push({
                                                        id: key,
                                                        alias: key,
                                                        dataType: tableau.dataTypeEnum.int
                                                    });
                                                    fields[key] = "int"; 
                                                    //log("Column " + key + " added as an integer");

                                                } else if ( res[0][key].match(/^\d*\.\d+$/)) {

                                                    // Float column definition (float)
                                                    cols.push({
                                                        id: key,
                                                        alias: key,
                                                        dataType: tableau.dataTypeEnum.float
                                                    });
                                                    fields[key] = "float"; 
                                                    //log("Column " + key + " added as a float");

                                                } else if ( res[0][key].match(/^(t|f|true|false)$/i) ) {
                                                    // Boolean column definition (bool)
                                                    cols.push({
                                                        id: key,
                                                        alias: key,
                                                        dataType: tableau.dataTypeEnum.bool
                                                    });
                                                    fields[key] = "bool"; 
                                                    //log("Column " + key + " added as a boolean");

                                                } else if ( res[0][key].match(/^\d{4}[\/-]\d{2}[\/-]\d{2}$/)
                                                         || res[0][key].match(/^\d{2}[\/-]\d{2}[\/-]\d{4}$/)
                                                         || res[0][key].match(/^\d{1,2}[\/ -][A-Z][a-z]+(\s\d{2,4})?$/)
                                                         || res[0][key].match(/^[A-Z][a-z]+\s+\d{1,2}(\s\d{2,4})?$/) ) {
                                                    // Date column definition
                                                    cols.push({
                                                        id: key,
                                                        alias: key,
                                                        dataType: tableau.dataTypeEnum.date
                                                    });
                                                    fields[key] = "date"; 
                                                    //log("Column " + key + " added as a date");

                                                } else if ( ! isNaN(Date.parse(res[0][key])) ) {
                                                    // Datetime column definition
                                                    cols.push({
                                                        id: key,
                                                        alias: key,
                                                        dataType: tableau.dataTypeEnum.datetime
                                                    });
                                                    fields[key] = "datetime"; 
                                                    //log("Column " + key + " added as a datetime");

                                                } else {
                                                    // String column definition
                                                    cols.push({
                                                        id: key,
                                                        alias: key,
                                                        dataType: tableau.dataTypeEnum.string
                                                    });
                                                }
                                            }); // End foreach key


                                            log('tableInfo');
                                            // Tableau Column Schema JS SDK Calls...
                                            var tableInfo = {
                                                id: "splunkFeed",
                                                alias: cName, // "Splunk Feed Test",
                                                columns: cols
                                            };

                                            // Add incrementColumnId if it exist
                                            if (typeof (_params[3]) != 'undefined') {
                                                tableInfo['incrementColumnId'] = _params[3]
                                            }

                                            // Send Table Schema Back
                                            schemaCallback([tableInfo]);
                                            log("schemaCallback");

                                        } else {
                                            log("[-] myoffset:: " + myOffset);
                                        }

                                        // Increase the offset to get the next set of results
                                        // once we are done processing the current set.
                                        log("[-] myOffset: " + myOffset + " | max_record_limit: " + max_record_limit + " | resultCount: " + resultCount);
                                        myOffset = myOffset + max_record_limit;
                                        done();
                                    });
                                },

                                // Done
                                function (err) {
                                    if (err) console.log("Error: " + err);
                                }
                            ); // Async Ends
                        }
                    });
                }
            });
    };


    // Process "res/result" the data
    myConnector.getData = function (table, doneCallback) {
        var fetchSplunkData = new Promise(function (resolve, reject) {
            var tableData = [];
            log("Total records: ");
            log(res.length);
            d = new Date();
            date_offset = 0; 
            // Correct the displayed time to be local time
            // Comment the following line to get the true time in UTC
            date_offset = d.getTimezoneOffset();
            for (var i=0; i<res.length; ++i) {
                if (i == 0) log(res[i]); // Convert datetime field data
                for (var field in fields) {
                    if ( fields[field] == "datetime" ) {
                        if ( ! isNaN(Date.parse(res[i][field]))) {
                            res[i][field] = new Date(Date.parse(res[i][field]) - date_offset*60000);
                        }
                    }
                }
                if (i == 0) log(res[i]);
                tableData.push(res[i]);
            }
            resolve(tableData);
        });
        Promise.all([fetchSplunkData]).then(function (data) {
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