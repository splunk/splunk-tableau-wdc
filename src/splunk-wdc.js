

// Runs at page load
(function () {

    var cols                = [];                                // Tableau Column definition
    var res                 = null;                             // Response Handler
    var max_record_limit    = 10000;                            // Max record splunk would return in one go.
    var myConnector         = new tableau.makeConnector();      // Create the connector object

    // returns array of SPL Query string and Auth string
    _params = lzw_decode(b64DecodeUnicode(window.location.href.split("?")[1].split("query=")[1])).split("[-][-][-]");

    var searchQuery = "search " + _params[0];                    // Build search Query  i.e. "search index=_internal | head 1000 | table host, source, sourcetype, _time"
    var auth = JSON.parse(_params[1]);                           // Auth details


    // Set the search parameters--specify a time range
    var searchParams = {
        exec_mode: "blocking",
        output_mode: "JSON"
    };

    // Using /proxy to bypass CORS and SSL validation
    var http    = new splunkjs.JQueryHttp();
    // var http = new splunkjs.ProxyHttp("https://tableau-wdc.splunk.link/proxy");
    var service = new splunkjs.Service(http, auth);

    // Populate UI
    auth["password"] = auth["password"].replace(/./g, '*');                     // Mask Password
    $(".input-information").append("<br> [-] SPL: " + searchQuery);             // Add SPL
    $(".input-information").append("<br> [-] Auth: " + JSON.stringify(auth));   // Add Auth


    // Define the schema
    myConnector.getSchema = function (schemaCallback) {
        var tableData = [];
        // Splunk JS SDK Calls...
        console.log("...getSchema!");

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
                        res = results.results;
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
                    });

                });

            });
    };


       // Download the data

      myConnector.getData = function (table, doneCallback) {
        var fetchSplunkData = new Promise(function(resolve,reject){
        var tableData = [];
                console.log(res); //
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

        tableau.registerConnector(myConnector);
        console.log("registerConnector");

        // Submit Data back to Tableau
        $("#submitToTableauButton").click(function () {
            //  tableau.registerConnector(myConnector);
            tableau.connectionName = "Splunk Feed";
            tableau.submit();
            console.log("submitToTableauButton");
          });
})();

function b64EncodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}


function b64DecodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

// LZW-compress a string
function lzw_encode(s) {
    var dict = {};
    var data = (s + "").split("");
    var out = [];
    var currChar;
    var phrase = data[0];
    var code = 256;
    for (var i=1; i<data.length; i++) {
        currChar=data[i];
        if (dict[phrase + currChar] != null) {
            phrase += currChar;
        }
        else {
            out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
            dict[phrase + currChar] = code;
            code++;
            phrase=currChar;
        }
    }
    out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
    for (var i=0; i<out.length; i++) {
        out[i] = String.fromCharCode(out[i]);
    }
    return out.join("");
}

// Decompress an LZW-encoded string
function lzw_decode(s) {
    var dict = {};
    var data = (s + "").split("");
    var currChar = data[0];
    var oldPhrase = currChar;
    var out = [currChar];
    var code = 256;
    var phrase;
    for (var i=1; i<data.length; i++) {
        var currCode = data[i].charCodeAt(0);
        if (currCode < 256) {
            phrase = data[i];
        }
        else {
           phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
        }
        out.push(phrase);
        currChar = phrase.charAt(0);
        dict[code] = oldPhrase + currChar;
        code++;
        oldPhrase = phrase;
    }
    return out.join("");
}
