// Node Web Server with /proxy

var replace = require("replace");

// Change root
console.log("[-] Making current directory as root handler.")
replace({
    regex: '__dirname, ".."',
    replacement: '__dirname, "../../../"',
    paths: ['./node_modules/splunk-sdk/bin/cli.js'],
    recursive: false,
    silent: false,
});

// Change listening port
console.log("[-] Changing http port from 6969 to 80.")
replace({
    regex: '6969;',
    replacement: '80;',
    paths: ['./node_modules/splunk-sdk/bin/cli.js'],
    recursive: false,
    silent: false,
});

// Run Node Web Server (splunk-sdk)
(function() {
    try {
        require('./node_modules/splunk-sdk/bin/cli');
    }
    catch (ex) {
        if (ex.message.indexOf("Cannot find module") >= 0) {
            console.error("NOTE: 'sdkdo' failed to run. Did you forget to run 'npm install'?");
        }

        throw ex;
    }
})();
