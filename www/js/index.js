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

$(function() {
    $('#nav').find('div').tap(function() {
        if ($(this).hasClass('activate')) return;
        $('#nav').find('div').removeClass('activate');
        $(this).addClass('activate');
        $('.container').hide();
        switch ($(this).attr('id')) {
            case 'nav_map':
                $('#map_container').show();
                break;
            case 'nav_mission':
                $('#mission_container').show();
                break;
            case 'nav_route':
                $('#route_container').show();
                break;
        }
    });
    app.initialize();
});