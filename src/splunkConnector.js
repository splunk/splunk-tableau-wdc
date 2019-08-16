// Global Variables

var auth = null;
var delimiter = "[-][-][-]";
var url_dir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
var linkGen_base = url_dir + "/" + "splunk-wdc.html?query=";



// Create a Service instance via Splunk JS
function createServiceInstance() {

  // Retrieve data from UI
  var _host = $('input[name="hostname"]').val();
  var _user = $('input[name="username"]').val();
  var _pass = $('input[name="password"]').val();
  var _token = $('input[name="token"]').val();
  var _schema = $('#schema option:selected').val();
  var _management_port = $('input[name="management_port"]').val();

  // Create auth object
  auth = {
    host: _host,
    scheme: _schema,
    port: _management_port
  };

  // Conditionally handle Basic Auth vs Token based Authentication
  if (_user != undefined && _user != "" && _pass != undefined && _pass != "") {
    auth.username = _user;
    auth.password = _pass;
  } else if (_token != undefined && _token != "") {
    auth.sessionKey = _token;
    auth.authorization = "Bearer";
  }

  // Set Proxy or Direct HTTP Connection
  if (window.location.href.split("?").length > 1)
    if (window.location.href.split("?")[1].includes("proxy=disabled")) {
      var http = new splunkjs.JQueryHttp();
    } else {
      var http = new splunkjs.ProxyHttp("/proxy");
    }
  else
    var http = new splunkjs.ProxyHttp("/proxy");

  // Create a Service Instance
  var service = new splunkjs.Service(http, auth);
  log(service);
  return service;
}



var configure_search_head_tooltip = `
• Splunk search head management port (8089 must be exposed to the internet for the connector to retrieve data. Easy way to check  connectivity is by using “Test Connection” button.
• Temporarily expose Internal Splunk via ngrok tcp sh.internal.example.com:8089. Learn more about ngrok at https://ngrok.com
• Deploy solution internally: For circumstances where Search Head cannot be exposed to the internet, this solution can be deployed within the internal network where both Tableau and Splunk can access the WDC Connector.
`;

$('.nav-item').attr('title', configure_search_head_tooltip);
// $('[data-toggle="tooltip"]').tooltip();
$('.nav-item').attr('data-original-title', configure_search_head_tooltip);



// Handle click event for Test Connection button
$('button[name="sh-test-connection"]').click(function () {

  // new service instance
  var service = new createServiceInstance();

  // Retrieve Splunk Version to Test Connection
  var isSuccessful = false;
  service.serverInfo(function (err, info) {
    try {
      log("Splunk Version: ", info.properties().version);
      isSuccessful = true;
      $('.connectionSuccessful').addClass('show');
      $('.connectionSuccessful').html("[-] Connected to Splunk Version: " + info.properties().version);

      // List savedSearch
      listSavedSearch(service);
      $('.connectionSuccessful').append("<br>[-] Populated SavedSearch");

      // Enable Next tab
      $("#savedsearch-spl-tab").removeClass('disabled');

      // Switch to Tab-2
      $(".nav-item > a").trigger('click');


      // Hide alert after 3s
      setTimeout(function () {
        $(".connectionSuccessful").removeClass("show");
      }, 3000);


    } catch (err) {
      log(err);
      log('err');
      $('.connectionError').addClass('show');
      $('.connectionError').html("Failed! Verify entered server details.");
    }
  });

  // Catch jQuery POST error
  setTimeout(function () {
    if (isSuccessful == false) {
      log('Error timeout');
      $('.connectionError').addClass('show');
      $('.connectionError').html("Failed! Verify entered server details.");
      // Hide alert after 3s
      setTimeout(function () {
        $(".connectionError").removeClass("show");
      }, 3000);
    }
  }, 3000);

});

// Should be removed as we do not have next button in UI
$('button[name="sh-next"]').click(function () {
  $(".nav-link:nth-child(1)").click();
});



(function () {
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

      // Retrieve value of SavedSearch SPL
      var savedSearchName = $("#SavedSearchDropDown option:selected").val();
      var savedSearchSPL = $("#SavedSearchDropDown option:selected").attr('title');

      // Retrieve value of incremental field (if any)
      var incremental_field_SavedSearch = $("#incremental_field_SavedSearch").val();
      var uniqField = incremental_field_SavedSearch;

      // Generate query parameters :: base64 encoded ( compressed (params))
      var auth_str = JSON.stringify(auth);

      // Add proxy=disabled
      if (window.location.href.split("?")[1] == "proxy=disabled") {
        var query_data = b64EncodeUnicode(lzw_encode(b64DecodeUnicode(savedSearchSPL) + delimiter + auth_str + delimiter + savedSearchName + delimiter + "proxy=disabled" + delimiter + uniqField));
      } else {
        var query_data = b64EncodeUnicode(lzw_encode(b64DecodeUnicode(savedSearchSPL) + delimiter + auth_str + delimiter + savedSearchName + delimiter + uniqField));
      }


      // Show panel depicting with resulting link
      $("#panel-linkGen").addClass("show");

      // Adds link along with query infromation to  the LinkGen textarea
      $("#linkGen").html(linkGen_base + query_data);
      $("#linkGen").focus();
      $("#linkGen").trigger("click");

    });

    // Submit Custom SPL
    $("#submitButtonSPL").click(function () {

      // Copy value of SPL Textarea
      var searchQuery = $("#SPLTextArea").val();

      if (searchQuery == "") {
        $('.connectionError').html("Custom SPL Can't be empty");
        $('.connectionError').addClass('show');
        // Hide alert after 3s
        setTimeout(function () {
          $(".connectionError").removeClass("show");
        }, 3000);
      } else {
        // Generate query parameters :: base64 encoded ( compressed (params))
        var auth_str = JSON.stringify(auth);

        // Retrieve value of incremental field (if any)
        var incremental_field_SPL = $("#incremental_field_SPL").val();
        var uniqField = incremental_field_SPL;

        // Add proxy=disabled
        if (window.location.href.split("?")[1] == "proxy=disabled") {
          var query_data = b64EncodeUnicode(lzw_encode(searchQuery + delimiter + auth_str + delimiter + "Custom SPL" + delimiter + uniqField + delimiter + "proxy=disabled"));
        } else {
          var query_data = b64EncodeUnicode(lzw_encode(searchQuery + delimiter + auth_str + delimiter + "Custom SPL" + delimiter + uniqField));
        }

        // Show panel depicting with resulting link
        $("#panel-linkGen").addClass("show");

        // Adds link along with query infromation to the LinkGen textarea
        $("#linkGen").html(linkGen_base + query_data);
        $("#linkGen").focus();
        $("#linkGen").click();
      }
    });


    // When user clicks on linkGenerator textarea
    $("#linkGen").click(function () {
      $(this).select();
      document.execCommand("copy");
      $(this).attr('title', 'Copied to clipboard');
      $(this).attr('data-original-title', 'Copied to clipboard');

      // Test auto-redirect once link is populated with details
      // window.location.replace( $("#linkGen").val());

    });


    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
    })

    // On Focus
    $("#linkGen").focus(function () {
      // Display label
      $('.linkCopiedlabel').addClass('show');

      // Hide label after 10 seconds
      setTimeout(function () {
        $('.linkCopiedlabel').removeClass('show');
      }, 10000);
    });


    // Debug selected SavedSearch
    $("#SavedSearchDropDown").change(function () {
      log($("#SavedSearchDropDown option:selected").attr('title'));
    });

    //
    $("#SearchHeadConfigButton").click(function () {
      $('#SavedSearchDropDown option:selected').attr("title");
    });

    // Trigger actions when user perform certain keypress on user/pass
    $("input[name='username'], input[name='password']").keypress(function (e) {
      // On Return/Enter key
      if (e.which == 13) {
        // Triger Test Connection
        $('button[name="sh-test-connection"]').trigger('click');
      }
    });



  });
})();


// Function to list all the splunk saved searches
function listSavedSearch(service) {
  // List all saved searches for the current username
  var mySavedSearches = service.savedSearches();
  mySavedSearches.fetch(function (err, mySavedSearches) {
    var savedSearchColl = mySavedSearches.list();
    var $dropdownSS = $("#SavedSearchDropDown");

    log("There are " + mySavedSearches.list().length + " saved searches");
    $dropdownSS.html("");

    log(mySavedSearches.list());
    for (var i = 0; i < savedSearchColl.length; i++) {
      var search = savedSearchColl[i];

      // Polulate drop down with result of SavedSearch
      // Debug list of saved search
      log(i + ": " + search.name);
      log("  Query: " + search.properties().search + "\n");

      // Fetch earliest and latest time from Saved Search
      var earliest_time = search._properties["dispatch.earliest_time"].replace(/rt/g, "");
      var latest_time = search._properties["dispatch.latest_time"].replace(/rt/g, "");

      var earliest_spl_for_datamodel = "";
      var latest_spl_for_datamodel = "";

      // if earliest or latest exists, build SPL
      if (earliest_time) {
        // For Saved Search with Datamodel
        earliest_spl_for_datamodel = '  | where _time > relative_time( now(), "' + earliest_time + '")'
        // For Normal Saved Search
        earliest_time = " earliest=" + earliest_time + " ";
      }
      if (latest_time) {
        // For Saved Search with Datamodel
        latest_spl_for_datamodel = '  | where _time < relative_time( now(), "' + latest_time + '")'
        // For Normal Saved Search
        latest_time = " latest=" + latest_time + " ";
      }

      log("Time: " + earliest_time + latest_time)

      // Build SPL form saved search and time parameters
      // base search
      /*
        String manipulation is necessary to position earliest and latest time at appropriate location.
        Condition below helps with positioning.
      */
      var baseSearch = search.properties().search;

      if (baseSearch.indexOf('datamodel') != -1) {
        log('DATAMODEL Found');
        var pipes = (baseSearch.match(/\|/g) || []).length;
        // When datamodel savedsearch has one pipe
        if (pipes == 1) {
          // i.e. | datamodel .... | where _time > earliest | where _time < latest
          _searchSPL = baseSearch + earliest_spl_for_datamodel + latest_spl_for_datamodel;
        } else if (pipes >= 2) {
          // When datamodel savedsearch has two or more pipe
          positionOfPipeAfterDatamodel = baseSearch.indexOf("|", baseSearch.indexOf("datamodel") + 1);
          n = positionOfPipeAfterDatamodel;
          _searchSPL = baseSearch.substring(0, n) + earliest_spl_for_datamodel + latest_spl_for_datamodel + baseSearch.substring(n, baseSearch.length);
        } else {
          // Default exception
          _searchSPL = earliest_time + latest_time + baseSearch;
        }
      } else {
        // Default
        _searchSPL = earliest_time + latest_time + baseSearch;
      }
      log("Outcome: " + _searchSPL);

      $dropdownSS.append($("<option />").val(search.name).text(search.name).attr("title", b64EncodeUnicode(_searchSPL)));



    }
  });
}