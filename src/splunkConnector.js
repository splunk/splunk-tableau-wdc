// Global Variables
var _debug = false;
var auth = null;
var delimiter = "[-][-][-]";
var url_dir = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
// var linkGen_base = url_dir + "/" + "splunk-wdc.html?query=";
var linkGen_base = "http://tableau-wdc.splunk.link/splunk/splunk-tableau-wdc/src/splunk-wdc.html?query=";

// Create a Service instance via Splunk JS
function createServiceInstance() {

  // Retrieve data from UI
  var _host   	        = $('input[name="hostname"]').val();
  var _user             = $('input[name="username"]').val();
  var _pass             = $('input[name="password"]').val();
  var _schema           = $('#schema option:selected').val();
  var _management_port 	= $('input[name="management_port"]').val();

  // Create auth object
  auth = {
    host:     _host,
    username: _user,
    password: _pass,
    scheme:   _schema,
    port:     _management_port
  };

  // Create a Service instance
  var http    = new splunkjs.JQueryHttp();
  // var http = new splunkjs.ProxyHttp("/proxy");
  var service = new splunkjs.Service(http, auth);
  log(service);
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
      log("Splunk Version: ", info.properties().version);
      isSuccessful = true;
      $('.connectionSuccessful').addClass('show');
      $('.connectionSuccessful').html("[-] Connected to Splunk Version: " + info.properties().version);

      // List savedSearch
      listSavedSearch(service);
      $('.connectionSuccessful').append("<br>[-] Populated SavedSearch");

      // Enable Next tab
      $("#savedsearch-spl-tab").removeClass('disabled');

      // Hide alert after 3s
      setTimeout(function() {
          $(".connectionSuccessful").removeClass("show");
      }, 3000);

    }
    catch(err){
      log(err);
      log('err');
      $('.connectionError').addClass('show');
      $('.connectionError').html("Failed! Verify entered server details.");
    }
  });

  // Catch jQuery POST error
  setTimeout(function(){
    if(isSuccessful == false) {
      log('Error timeout');
      $('.connectionError').addClass('show');
      $('.connectionError').html("Failed! Verify entered server details.");
      // Hide alert after 3s
      setTimeout(function() {
          $(".connectionError").removeClass("show");
      }, 3000);
    }
  }, 3000);

});

  $('button[name="sh-next"]').click(function(){
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
        // new service instance
        var service = new createServiceInstance();

        // Retrieve value of SavedSearch SPL
        var savedSearchName  = $("#SavedSearchDropDown option:selected").attr('title');
        // Generate query parameters :: base64 encoded ( compressed (params))
        var auth_str = JSON.stringify(auth);
        var query_data =  b64EncodeUnicode(lzw_encode(b64DecodeUnicode(savedSearchName) + delimiter + auth_str));

        // Show panel depicting with resulting link
        $("#panel-linkGen").addClass("show");

        // Adds link along with query infromation to  the LinkGen textarea
        $("#linkGen").html(linkGen_base + query_data);
        $("linkGen").focus();
        $("linkGen").trigger( "click" );

      });

      // Submit Custom SPL
      $("#submitButtonSPL").click(function () {
        // new service instance
        var service = new createServiceInstance();

        // Copy value of SPL Textarea
        var searchQuery = $("#SPLTextArea").val();

        // Eliminating meta fields data in output
        // searchQuery = searchQuery + " | fields - _bkt, _cd, _indextime, _raw, _si, _subsecond, _sourcetype, splunk_server, linecount, component, punct | fields *"

        // Generate query parameters :: base64 encoded ( compressed (params))
        var auth_str = JSON.stringify(auth);
        var query_data =  b64EncodeUnicode(lzw_encode(searchQuery + delimiter + auth_str));

        // Show panel depicting with resulting link
        $("#panel-linkGen").addClass("show");
        
        // Adds link along with query infromation to  the LinkGen textarea
        $("#linkGen").html(linkGen_base + query_data);

        $("linkGen").focus();
        $("linkGen").click();


      });


      // When user clicks on linkGenerator textarea
      $("#linkGen").click(function () {
        $(this).select();
        document.execCommand("copy");
        $(this).attr('title','Copied to clipboard');
        $(this).attr('data-original-title','Copied to clipboard');

        // new service instance
        var service = new createServiceInstance();
        var searchQuery = $("#linkGen").val();

      });


      $(function () {
        $('[data-toggle="tooltip"]').tooltip()
      })

      // On Focus
      $("#linkGen").focus(function(){
          // Display label
          $('.linkCopiedlabel').addClass('show');

          // Hide label after 10 seconds
          setTimeout(() => {
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


    });
})();


// Function to list all the splunk saved searches
function listSavedSearch(service){
  // List all saved searches for the current username
  var mySavedSearches = service.savedSearches();
  mySavedSearches.fetch(function(err, mySavedSearches) {
    var savedSearchColl = mySavedSearches.list();
    var $dropdownSS = $("#SavedSearchDropDown");

    log("There are " + mySavedSearches.list().length + " saved searches");
    $dropdownSS.html("");

    for(var i = 0; i < savedSearchColl.length; i++) {
        var search = savedSearchColl[i];

        // Polulate drop down with result of SavedSearch
        $dropdownSS.append($("<option />").val(search.name).text(search.name).attr( "title", b64EncodeUnicode(search.properties().search )));

        // Debug list of saved search
        log(i + ": " + search.name);
        log("  Query: " + search.properties().search + "\n");
    }
  });
}


// Handle logs
function log(message){
  if (_debug)
    console.log(message);
}

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
