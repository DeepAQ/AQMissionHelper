/////////// begin WGS84 to GCJ-02 transformer /////////
var WGS84transformer = function() {};
// Krasovsky 1940
//
// a = 6378245.0, 1/f = 298.3
// b = a * (1 - f)
// ee = (a^2 - b^2) / a^2;
WGS84transformer.prototype.a = 6378245.0;
WGS84transformer.prototype.ee = 0.00669342162296594323;

WGS84transformer.prototype.transform = function(wgLat, wgLng) {
    if(this.isOutOfChina(wgLat, wgLng))
        return {lat: wgLat, lng: wgLng};
    dLat = this.transformLat(wgLng - 105.0, wgLat - 35.0);
    dLng = this.transformLng(wgLng - 105.0, wgLat - 35.0);
    radLat = wgLat / 180.0 * Math.PI;
    magic = Math.sin(radLat);
    magic = 1 - this.ee * magic * magic;
    sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((this.a * (1 - this.ee)) / (magic * sqrtMagic) * Math.PI);
    dLng = (dLng * 180.0) / (this.a / sqrtMagic * Math.cos(radLat) * Math.PI);
    mgLat = wgLat + dLat;
    mgLng = wgLng + dLng;
    return {lat: mgLat, lng: mgLng};
};

WGS84transformer.prototype.isOutOfChina = function(lat, lng) {
    if(lng < 72.004 || lng > 137.8347) return true;
    if(lat < 0.8293 || lat > 55.8271) return true;
    return false;
};

WGS84transformer.prototype.transformLat = function(x, y) {
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
};

WGS84transformer.prototype.transformLng = function(x, y) {
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
};
/////////// end WGS84 to GCJ-02 transformer /////////

var wgstogcj = new WGS84transformer();

var app = {
    // Application Constructor
    initialize: function() {
        app.location = {};
        if (window.location.href.substr(0, 4) == 'http') {
            // online version
            this.onDeviceReady();
            app.datasrc = '.';
        } else {
            document.addEventListener('deviceready', this.onDeviceReady, false);
            app.datasrc = 'http://ingressmm.com';
        }
        // init map view
        app.map = new AMap.Map('map_container');
        app.map.plugin('AMap.Scale', function() {
            app.map.addControl(new AMap.Scale());
        });
        app.map.markers = [];
        // init geolocation
        app.location.circle = new AMap.Marker({
            map: app.map,
            offset: new AMap.Pixel(-11.5, -11.5),
            icon: 'http://webapi.amap.com/theme/v1.3/markers/n/loc.png',
            zIndex: 200,
            visible: false
        });
        app.location.firstFix = true;
        app.loadSaved();
    },

    loadlist: function(url) {
        $('#mission_suggest').hide();
        $('#mission_list').show();
        $('#mission_list_content').html('Loading…');
        $.getJSON(url, function(result) {
            $('#mission_list_content').html('');
            if (result.mission.length == 0) {
                $('#mission_list_content').html('No Result');
            } else for (var key in result.mission) {
                var mission = result.mission[key];
                var sequence = '';
                if (mission.sequence == '1') {
                    sequence = 'Seq';
                } else if (mission.sequence == '2') {
                    sequence = 'Any';
                }
                var gcjPos = wgstogcj.transform(mission.latitude, mission.longitude);
                var content = '<div class="mission" data:missionid="' + mission.id + '"><div class="mission_icon"><img src="http://ingressmm.com/icon/' + mission.code + '.jpg" /></div><div class="mission_title">' + mission.name + '</div><div>' + sequence + ' <span class="distance" data:lat="' + gcjPos.lat + '" data:lng="' + gcjPos.lng + '"></span></div></div>';
                $('#mission_list_content').append(content);
            }
            app.calcDistance();
        });
    },

    updateLocation: function(lat, lng) {
        app.location.lat = lat;
        app.location.lng = lng;
        app.calcDistance();
        app.location.circle.setPosition([lng, lat]);
        app.location.circle.show();
        if (app.location.firstFix) {
            app.map.setZoomAndCenter(16, [lng, lat]);
            app.location.firstFix = false;
        }
    },

    calcDistance: function() {
        $('.distance').each(function() {
            var lat = Number($(this).attr('data:lat'));
            var lng = Number($(this).attr('data:lng'));
            $(this).html(Math.ceil(new AMap.LngLat(lng, lat).distance([app.location.lng, app.location.lat])) + 'm');
        });
    },
    
    loadSaved: function() {
        $('#saved_list').html('No saved searches');
        if (!localStorage.saved_search) return;
        try {
            var saved = JSON.parse(localStorage.saved_search);
            $('#saved_list').html('');
            for (var key in saved) {
                $('#saved_list').append('<div data:name="'+saved[key]+'" data:key="'+key+'"><a href="javascript:">'+key+'</a> <a href="javascript:">[Delete]</a></div>');
            }
        } catch (e) {}
    },

    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        if (window.AMapBridge) {
            // For Android
            app.amapUpdate = function() {
                AMapBridge.getLocation(function(result) {
                    if (result == "") return;
                    app.updateLocation(result.lat, result.lng);
                    setTimeout(app.amapUpdate, 2000);
                });
            };
            app.amapUpdate();
        } else {
            app.location.watch = navigator.geolocation.watchPosition(function(result) {
                if (result.coords.accuracy = null) return;
                var pos = wgstogcj.transform(result.coords.latitude, result.coords.longitude);
                app.updateLocation(pos.lat, pos.lng);
            }, null, {
                enableHighAccuracy: true
            });
        }
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
        $('#mission_list').show();
        $('#btn_list_save').show();
        app.loadlist(app.datasrc+'/get_mission.php?find='+$('#input_mission_name').val()+'&findby=0');
    });

    $('#saved_list').on('tap', 'a:nth-child(1)', function() {
        var name = $(this).parent().attr('data:name');
        $('#input_mission_name').val(name);
        $('#btn_mission_search').tap();
    }).on('click', 'a:nth-child(2)', function() {
        var key = $(this).parent().attr('data:key');
        try {
            var saved = JSON.parse(localStorage.saved_search);
            delete saved[key];
            localStorage.saved_search = JSON.stringify(saved);
        } catch (e) {}
        app.loadSaved();
    });
    
    // init mission list
    $('#btn_list_back').tap(function() {
        $('#btn_list_save').hide();
        $('#mission_list').hide();
        $('#mission_suggest').show();
    });

    $('#btn_list_save').click(function() {
        var name = prompt("Save as :", $('#input_mission_name').val());
        if (name == null) return;
        var data = {};
        if (localStorage.saved_search) {
            try {
                data = JSON.parse(localStorage.saved_search);
            } catch (e) {}
        }
        data[name] = $('#input_mission_name').val();
        localStorage.saved_search = JSON.stringify(data);
        app.loadSaved();
    });

    $('#mission_list').on('tap', '.mission', function() {
        //alert($(this).attr('data:missionid'));
        $('#mission_detail_info').html($(this).html());
        $('#mission_search_box').hide();
        $('#mission_list').hide();
        $('#mission_detail').show();
        $('#btn_show_map').hide();
        $('#mission_detail_waypoints').html('Loading mission waypoints…');
        $.getJSON(app.datasrc+'/get_portal.php?mission='+$(this).attr('data:missionid'), function(result) {
            $('#mission_detail_waypoints').html('');
            app.current_mission = result;
            if (result.portal.length == 0) {
                $('#mission_detail_waypoints').html('Get portals failed…');
            } else for (var i = 0; i < result.portal.length; i++) {
                var waypoint = result.portal[i];
                var content = '<div class="waypoint"><div class="waypoint_name">' + (i+1) + '. ';
                if (waypoint[0]) {
                    content = content + 'Waypoint Hidden' + '</div>';
                } else {
                    content = content + waypoint[2].name + '</div>';
                }
                var task_list = [
                    "",
                    "Hack this Portal",
                    "Capture or Upgrade Portal",
                    "Create Link from Portal",
                    "Create Field from Portal",
                    "Install a Mod on this Portal",
                    "Enter the Passphrase",
                    "View this Field Trip Waypoint",
                    "Enter the Passphrase"
                ];
                if (!waypoint[0]) {
                    var gcjPos = wgstogcj.transform(waypoint[2].latitude, waypoint[2].longitude);
                    content = content + '<div>' + task_list[waypoint[1]] + '</div>' + '<div><span class="distance" data:lat="' + gcjPos.lat + '" data:lng="' + gcjPos.lng + '"></span> <a href="javascript:">Walk</a> <a href="javascript:">Drive</a> <a href="javascript:">Transit</a></div>';
                }
                content = content + '</div>';
                $('#mission_detail_waypoints').append(content);
            }
            $('#btn_show_map').show();
            app.calcDistance();
            app.map.remove(app.map.markers);
            for (var i = 0; i < app.current_mission.portal.length; i++) {
                var waypoint = app.current_mission.portal[i];
                if (waypoint[0]) continue;
                var newpos = new WGS84transformer().transform(waypoint[2].latitude, waypoint[2].longitude);
                var marker = new AMap.Marker({
                    map: app.map,
                    position: [newpos.lng, newpos.lat],
                    offset: new AMap.Pixel(-16, -16),
                    icon: 'https://ingressmm.com/img/p' + (Array(2).join(0)+(i+1)).slice(-2) + 'n.png'
                });
                app.map.markers.push(marker);
                if (i == 0) {
                    app.map.setZoomAndCenter(16, [newpos.lng, newpos.lat]);
                }
            }
        });
    });
    
    // init mission detail
    $('#btn_detail_back').click(function() {
        if (app.transport) {
            app.transport.clear();
        }
        $('#mission_detail').hide();
        $('#mission_search_box').show();
        $('#mission_list').show();
    });
    
    $('#btn_show_map').tap(function() {
        $('#nav_map').tap();
    });
    
    $('#mission_detail_waypoints').on('tap', 'a', function() {
        var _this = $(this);
        AMap.service(['AMap.Walking', 'AMap.Driving', 'AMap.Transfer'], function() {
            var param = {
                map: app.map,
                panel: 'route_container'
            };
            if (app.transport) {
                app.transport.clear();
            }
            switch (_this.html()) {
                case 'Walk':
                    app.transport = new AMap.Walking(param);
                    $('#nav_map').tap();
                    break;
                case 'Drive':
                    app.transport = new AMap.Driving(param);
                    $('#nav_route').tap();
                    break;
                case 'Transit':
                    app.transport = new AMap.Transfer(param);
                    $('#nav_route').tap();
                    break;
            }
            var target = _this.parent().find('.distance');
            var target_pos = [Number(target.attr('data:lng')), Number(target.attr('data:lat'))];
            app.transport.search([app.location.lng, app.location.lat], target_pos);
        });
    });

    // init app
    app.initialize();
});