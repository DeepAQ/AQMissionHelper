/////////// begin WGS84 to GCJ-02 transformer /////////
var WGS84transformer = function () {
};
// Krasovsky 1940
//
// a = 6378245.0, 1/f = 298.3
// b = a * (1 - f)
// ee = (a^2 - b^2) / a^2;
WGS84transformer.prototype.a = 6378245.0;
WGS84transformer.prototype.ee = 0.00669342162296594323;

WGS84transformer.prototype.transform = function (wgLat, wgLng) {
    if (this.isOutOfMainlandChina(wgLat, wgLng))
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

WGS84transformer.prototype.isOutOfMainlandChina = function (lat, lng) {
    if (lat >= 21.8 && lat <= 25.3 && lng >= 120.0 && lng <= 122.0) return true;
    if (lng < 72.004 || lng > 137.8347) return true;
    if (lat < 0.8293 || lat > 55.8271) return true;
    return false;
};

WGS84transformer.prototype.transformLat = function (x, y) {
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
    return ret;
};

WGS84transformer.prototype.transformLng = function (x, y) {
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
    return ret;
};
/////////// end WGS84 to GCJ-02 transformer /////////

var wgstogcj = new WGS84transformer();

var app = {
    data: {},
    online_url: 'https://aqmh.azurewebsites.net',

    // Application Constructor
    initialize: function () {
        // init map view
        app.map = new AMap.Map('amap');
        app.map.plugin(['AMap.ToolBar', 'AMap.Scale'], function () {
            app.map.addControl(new AMap.ToolBar());
            app.map.addControl(new AMap.Scale());
        });
        app.switchTab('map');
        // init geolocation
        app.location = {};
        app.location.circle = new AMap.Marker({
            map: app.map,
            offset: new AMap.Pixel(-11.5, -11.5),
            icon: 'img/loc.png',
            zIndex: 200,
            visible: false
        });
        app.location.firstFix = true;
        // init mission suggest
        app.loadRecent();
        app.loadSaved();
        app.loadTrending();
        // finish initialization
        if (window.location.href.substr(0, 4) == 'http') {
            // online version
            app.datasrc = '.';
            this.onDeviceReady();
        } else {
            app.datasrc = 'https://ingressmm.com'; // for compatibility
            document.addEventListener('deviceready', this.onDeviceReady, false);
        }
    },

    // deviceready Event Handler
    onDeviceReady: function () {
        if (window.AMapBridge) {
            // Android client
            setInterval(function () {
                AMapBridge.getLocation(function (result) {
                    if (!result.lat || !result.lng) return;
                    app.updateLocation(result.lat, result.lng);
                });
            }, 1000);
        } else {
            // other browsers
            setInterval(function () {
                navigator.geolocation.getCurrentPosition(function (result) {
                    if (result.coords.accuracy == null) return;
                    var pos = wgstogcj.transform(result.coords.latitude, result.coords.longitude);
                    app.updateLocation(pos.lat, pos.lng);
                }, null, {
                    enableHighAccuracy: true
                });
            }, 1000);
        }
        // Device orientation
        if (navigator.compass) {
            app.location.circle.setIcon('img/loc_o.png');
            app.location.circle.setOffset(new AMap.Pixel(-11.5, -13.5));
            navigator.compass.watchHeading(function (heading) {
                app.location.circle.setAngle(heading.magneticHeading);
            }, null, {
                frequency: 100
            });
        }
        // load versions
        $('#local_ver').load('version.html', function () {
            $('#online_ver').load(app.online_url + '/version.html', function (result) {
                if (window.AMapBridge && result && result != $('#local_ver').html()) {
                    $('#update').show();
                }
            });
        });
    },

    finishLoading: function () {
        app.switchTab('mission');
        $('#loading').hide();
        var query = location.hash.match(/^#q=([^&]+)(&qt=)*([^&]*)$/i);
        if (query) {
            app.performSearch(decodeURIComponent(query[1]), decodeURIComponent(query[3]));
        }
    },

    switchTab: function (tabName) {
        $('.container').hide();
        $('#' + tabName + '_container').show();

        $('nav').find('section').each(function () {
            if ($(this).attr('data-item') == tabName) {
                $(this).addClass('activate');
            } else {
                $(this).removeClass('activate');
            }
        });
    },

    updateLocation: function (lat, lng) {
        app.location.lat = lat;
        app.location.lng = lng;
        app.calcDistance();
        app.location.circle.setPosition([lng, lat]);
        app.location.circle.show();
        if (app.location.firstFix) {
            app.map.setZoomAndCenter(16, [lng, lat]);
            app.location.firstFix = false;
            $('#skip').hide();
            setTimeout(app.finishLoading, 1000);
        }
    },

    loadList: function (url, type) {
        if (!type) {
            type = 'ingressmm';
        }
        $('#mission_suggest, #mission_preview, #btn_list_preview').hide();
        $('#mission_list').show();
        $('#mission_list_content').html('Loading ...');
        $.get(url, app.data[type].parseList);
    },

    loadListCallback: function (result) {
        var list = $('#mission_list_content');
        if (!result || result.length == 0) {
            list.html('No Result _(:з」∠)_');
            return;
        }
        app.list = result;

        var content = '';
        for (var i = 0; i < app.list.length; i++) {
            var mission = app.list[i];
            var type = 'Hidden';
            if (mission.seq == 1) {
                type = 'Sequential';
            } else if (mission.seq == 2) {
                type = 'Any Order';
            } else if (mission.seq == 9) {
                type = 'Unknown';
            }
            var gcjPos = wgstogcj.transform(mission.lat, mission.lng);
            content += '<div class="mission" data-index="' + i + '">' +
                '<img src="' + mission.icon + '">' +
                '<div><div>' + mission.name + '</div>' +
                '<div>' + type + ' <span class="distance" data-lat="' + gcjPos.lat + '" data-lng="' + gcjPos.lng + '"></span></div>' +
                '</div></div>';
        }
        list.html(content);
        app.calcDistance();

        if (app.list.length % 6 == 0) {
            $('#btn_list_preview').show();
        }
    },

    loadMission: function (index, show) {
        $('#mission_detail_info').html($('#mission_list_content').children().eq(index).html());
        var list = $('#mission_waypoints');
        list.html('Loading mission waypoints ...');

        var mission = app.list[index];
        app.data[mission.type].getPortals(mission, function (result) {
            var content = '';

            if (app.map.markers) {
                app.map.remove(app.map.markers);
            }
            app.map.markers = [];
            var minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

            if (!result || result.length == 0) {
                list.html('Failed to fetch mission detail _(:з」∠)_');
            } else for (var i = 0; i < result.length; i++) {
                var waypoint = result[i];
                content += '<div class="waypoint"><div>' + (i + 1) + '. ';

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
                if (waypoint.hidden) {
                    content += 'Waypoint Hidden' + '</div>';
                } else {
                    content += waypoint.name + '</div>';
                    var gcjPos = wgstogcj.transform(waypoint.lat, waypoint.lng);
                    if (gcjPos.lat < minLat) minLat = gcjPos.lat;
                    if (gcjPos.lat > maxLat) maxLat = gcjPos.lat;
                    if (gcjPos.lng < minLng) minLng = gcjPos.lng;
                    if (gcjPos.lng > maxLng) maxLng = gcjPos.lng;
                    content += '<div>' + task_list[waypoint.task] + '</div>' +
                        '<div><span class="distance" data-lat="' + gcjPos.lat + '" data-lng="' + gcjPos.lng + '"></span> ' +
                        '<a href="https://www.ingress.com/intel?ll=' + waypoint.lat + ',' + waypoint.lng + '" target="_blank">Intel</a> ' +
                        '<a href="javascript:">Walk</a> ' +
                        '<a href="javascript:">Ride</a> ' +
                        '<a href="javascript:">Drive</a> ' +
                        '<a href="javascript:">Transit</a></div>';
                    var marker = new AMap.Marker({
                        map: app.map,
                        position: [gcjPos.lng, gcjPos.lat],
                        offset: new AMap.Pixel(-12, -12),
                        content: '<div class="waypoint_marker">' + (Number(i) + 1) + '</div>'
                    });
                    app.map.markers.push(marker);
                }
                content += '</div>';
            }
            list.html(content);

            var show_map = function () {
                $('#mission_switch').show().find('span').html(mission.name).parent().attr('data-index', index);
                app.map.setBounds(new AMap.Bounds([minLng, minLat], [maxLng, maxLat]));
                app.switchTab('map');
            };
            $('#btn_show_map').click(show_map).show();
            if (show) {
                show_map();
            }
            app.calcDistance();
        });
    },

    performSearch: function (key, type) {
        if (!type) {
            type = 'ingressmm';
        }
        var search_box = $('#mission_search_box');
        search_box.find('input').val(key);
        search_box.find('select').val(type);
        key = encodeURIComponent(key);
        location.hash = 'q=' + key + '&qt=' + type;
        app.data[type].search(key);
    },

    calcDistance: function () {
        if (!app.location.lng || !app.location.lat) return;
        $('.distance').each(function () {
            var lat = Number($(this).attr('data-lat'));
            var lng = Number($(this).attr('data-lng'));
            $(this).html(Math.ceil(new AMap.LngLat(lng, lat).distance([app.location.lng, app.location.lat])) + 'm');
        });
    },

    loadRecent: function () {
        var list = $('#recent_list');
        list.html('No recent searches');
        if (!localStorage.recent_search) return;
        try {
            var recent = JSON.parse(localStorage.recent_search);
            var content = '';
            for (var i in recent) {
                content = '<div data-name="' + recent[i].key + '" data-type="' + recent[i].type + '"><a href="javascript:">' + recent[i].key + ' (' + recent[i].type + ')</a></div>' + content;
            }
            list.html(content);
        } catch (e) {
        }
    },

    loadSaved: function () {
        var list = $('#saved_list');
        list.html('No saved searches');
        if (!localStorage.saved_search) return;
        try {
            var saved = JSON.parse(localStorage.saved_search);
            var content = '';
            for (var key in saved) {
                content = '<div data-name="' + saved[key].key + '" data-type="' + saved[key].type + '" data-key="' + key + '"><a href="javascript:">' + key + ' (' + saved[key].type + ')</a> <a href="javascript:">[Delete]</a></div>' + content;
            }
            list.html(content);
        } catch (e) {
        }
    },

    loadTrending: function () {
        $.getScript(app.online_url + '/trending.aq');
    }
};

$(function () {
    // init loading
    $('#skip').click(function () {
        app.location.firstFix = false;
        app.finishLoading();
    });

    // init nav bar
    $('nav').find('section').click(function () {
        if ($(this).hasClass('activate')) return;
        app.switchTab($(this).attr('data-item'));
    });

    // init mission search
    var search_box = $('#mission_search_box');
    var search_submit = function () {
        var key = $.trim(search_box.find('input').val());
        var type = search_box.find('select').val();
        if (key == '') return;
        $('#mission_list, #btn_list_save').show();
        app.performSearch(key, type);
        // save to recent searches
        var data = [];
        if (localStorage.recent_search) {
            try {
                data = JSON.parse(localStorage.recent_search);
            } catch (e) {
            }
        }
        var search = {key: key, type: type};
        if (localStorage.recent_search.indexOf(JSON.stringify(search)) == -1) {
            data.push(search);
            while (data.length > 5) {
                data.shift();
            }
        }
        localStorage.recent_search = JSON.stringify(data);
        app.loadRecent();
    };
    search_box.find('button').click(search_submit);
    search_box.find('input').keypress(function (e) {
        if (e.which == 13) {
            search_submit();
        }
    });

    // init mission suggest
    $('#saved_list, #recent_list').on('click', 'a:first-child', function () {
        var name = $(this).parent().attr('data-name');
        var type = $(this).parent().attr('data-type');
        app.performSearch(name, type);
    });

    $('#saved_list').on('click', 'a:last-child', function () {
        if (confirm("Are you sure to delete?")) {
            var key = $(this).parent().attr('data-key');
            try {
                var saved = JSON.parse(localStorage.saved_search);
                delete saved[key];
                localStorage.saved_search = JSON.stringify(saved);
            } catch (e) {
            }
        }
        app.loadSaved();
    });

    // init mission list
    $('#btn_list_back').click(function () {
        location.hash = '';
        $('#btn_list_save, #mission_list').hide();
        $('#mission_suggest').show();
    });

    $('#btn_list_save').click(function () {
        var input = search_box.find('input').val();
        var type = search_box.find('select').val();
        var name = prompt("Save as :", input);
        if (!name) return;
        var data = {};
        if (localStorage.saved_search) {
            try {
                data = JSON.parse(localStorage.saved_search);
            } catch (e) {
            }
        }
        data[name] = {key: input, type: type};
        localStorage.saved_search = JSON.stringify(data);
        app.loadSaved();
    });

    $('#btn_list_preview').click(function () {
        $('#mission_list').hide();
        var content = '';
        for (var i = 0; i < app.list.length; i++) {
            content = '<img src="' + app.list[i].icon + '">' + content;
        }
        $('#mission_preview_content').html(content);
        $('#mission_preview').show();
    });

    $('#mission_list').on('click', '.mission', function () {
        app.lastScroll = document.body.scrollTop;
        search_box.hide();
        $('#mission_list, #btn_show_map').hide();
        $('#mission_detail').show();
        app.loadMission($(this).attr('data-index'));
    });

    $('#mission_switch').find('a').click(function () {
        var new_index = Number($(this).parent().attr('data-index')) + Number($(this).attr('data-delta'));
        if (new_index < 0 || new_index >= app.list.length) return;
        $(this).parent().find('span').html('Loading ...');
        app.loadMission(new_index, true);
    });

    // init mission preview
    $('#btn_preview_back').click(function () {
        $('#mission_preview').hide();
        $('#mission_list').show();
    });

    $('#btn_preview_flip').click(function () {
        var content = '', container = $('#mission_preview_content'),
            children = container.children();
        for (var i = 0; i < children.length; i++) {
            content = children[i].outerHTML + content;
        }
        container.html(content);
    });

    // init mission detail
    $('#btn_detail_back').click(function () {
        if (app.map.markers) {
            app.map.remove(app.map.markers);
            app.map.markers = [];
        }
        if (app.transport) {
            app.transport.clear();
        }
        $('#mission_switch, #mission_detail').hide();
        $('#mission_search_box, #mission_list').show();
        if (app.lastScroll) document.body.scrollTop = app.lastScroll;
    });

    // init transport search
    $('#mission_waypoints').on('click', 'a', function () {
        var _this = $(this);
        if (_this.html() == 'Intel') return;
        if (app.transport) {
            app.transport.clear();
        }
        AMap.service(['AMap.Walking', 'AMap.Riding', 'AMap.Driving', 'AMap.Transfer'], function () {
            var param = {
                map: app.map,
                panel: 'route_container',
                showTraffic: true,
                city: 'undefined',
                nightflag: true
            };
            switch (_this.html()) {
                case 'Walk':
                    app.transport = new AMap.Walking(param);
                    app.switchTab('map');
                    break;
                case 'Ride':
                    app.transport = new AMap.Riding(param);
                    app.switchTab('map');
                    break;
                case 'Drive':
                    param.policy = AMap.DrivingPolicy.REAL_TRAFFIC;
                    app.transport = new AMap.Driving(param);
                    app.switchTab('route');
                    break;
                case 'Transit':
                    app.transport = new AMap.Transfer(param);
                    app.switchTab('route');
                    break;
            }
            var target = _this.parent().find('.distance');
            app.transport.search([app.location.lng, app.location.lat],
                [Number(target.attr('data-lng')), Number(target.attr('data-lat'))],
                function (status, result) {
                    if (status != 'complete' || !result.info) {
                        alert('No route found _(:з」∠)_');
                        app.switchTab('mission');
                    }
                }
            );
        });
    });

    // init app
    app.initialize();
});

// analyze
var _hmt = _hmt || [];
(function () {
    var hm = document.createElement("script");
    hm.src = "//hm.baidu.com/hm.js?f4d807d64f88ea0422d095decf0430f4";
    var s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(hm, s);
})();