// Node Web Server with /proxy

var replace = require("replace");
var debug = false;
// Change root

function log(message){
  if(debug == true) console.log(message);
}

log("[-] INFO: Making current directory as root handler.")
replace({
    regex: '__dirname, ".."',
    replacement: '__dirname, "../../../"',
    paths: ['./node_modules/splunk-sdk/bin/cli.js'],
    recursive: false,
    silent: false,
});

// Change listening port
log("[-] INFO: Changing http port from 6969 to 80.")
replace({
    regex: '6969;',
    replacement: '80;',
    paths: ['./node_modules/splunk-sdk/bin/cli.js'],
    recursive: false,
    silent: false,
});

// Run Node Web Server (splunk-sdk)
console.log("\n[-] INFO: Starting Node Web Server");
console.log("\n[-] Tip: In a situation where you may want to expose local port to other network, you may use 'ngrok tcp 80' or ssh tunnel");
console.log("\n[-] Tip: Avoid using localhost or 127.0.0.1, so that Tableau can connect with WDC Link.");
console.log("[-] == To find LAN Interface IP ==");
console.log("\t[-] For macOS, use $ ifconfig | grep broadcast");
console.log("\t[-] For Linux, use $ ifconfig | grep Bcast");
console.log("\t[-] For Windows, use cmd> netstat -r | findstr 0.0.0.0 | find /V link");



console.log("\n[-] Access Splunk Tableau WDC at <LAN-IP:80>/src/splunkConnector.html \n");
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
