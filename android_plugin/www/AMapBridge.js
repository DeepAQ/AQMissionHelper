var cordova = require('cordova');
var exec = cordova.require('cordova/exec');

window.AMapBridge = {
    getLocation: function(callback) {
        exec(callback, callback, "AMapBridge", "getLocation", []);
    }
};

module.exports = AMapBridge;