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
                    app.map.setZoomAndCenter(16, result.position);
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
    // init nav bar
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
    // init mission search
    $('#btn_mission_search').tap(function() {
        $('#mission_list').html('Loading…');
        $.getJSON('http://ingressmm.com/get_mission.php?find='+$('#input_mission_name').val()+'&findby=0', function(result) {
            $('#mission_list').html('');
            if (result.mission.length == 0) {
                $('#mission_list').html('No Result');
            } else for (var key in result.mission) {
                var mission = result.mission[key];
                var sequence = '';
                if (mission.sequence == '1') {
                    sequence = 'Seq';
                } else if (mission.sequence == '2') {
                    sequence = 'Any';
                }
                var content = '<div id="mission_list"><div class="mission"><div class="mission_icon"><img src="' + mission.icon +'" /></div><div class="mission_title">' + mission.name + '</div><div>' + sequence + '</div></div></div>';
                $('#mission_list').append(content);
            }
        });
    });
    // init app
    app.initialize();
});