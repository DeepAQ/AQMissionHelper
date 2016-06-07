var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        app.map = new AMap.Map('map_container');
        app.map.plugin('AMap.Scale', function() {
            app.map.addControl(new AMap.Scale());
        });
        app.map.plugin('AMap.Geolocation', function() {
            app.map.geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 5000,
                buttonPosition: 'RT',
                showCircle: false,
                panToLocation: false
            });
            app.map.addControl(app.map.geolocation);
            app.map.geolocation.firstFix = true;
            app.map.geolocation.watchPosition();
            AMap.event.addListener(app.map.geolocation, 'complete', function(result) {
                if (app.map.geolocation.firstFix) {
                    app.map.setZoomAndCenter(15, result.position);
                    app.map.geolocation.firstFix = false;
                }
            });
        });
    },

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {

    }
};
