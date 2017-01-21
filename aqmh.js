/////////// begin WGS84 to GCJ-02 transformer /////////
class WGS84transformer {
    constructor() {
        // Krasovsky 1940
        //
        // a = 6378245.0, 1/f = 298.3
        // b = a * (1 - f)
        // ee = (a^2 - b^2) / a^2;
        this.a = 6378245.0;
        this.ee = 0.00669342162296594323;
    }

    transform(wgLat, wgLng) {
        if (WGS84transformer.isOutOfMainlandChina(wgLat, wgLng))
            return {lat: wgLat, lng: wgLng};
        const radLat = wgLat / 180.0 * Math.PI;
        const magic = 1 - this.ee * (Math.sin(radLat) ** 2);
        const sqrtMagic = Math.sqrt(magic);
        const dLat = (WGS84transformer.transformLat(wgLng - 105.0, wgLat - 35.0) * 180.0) / ((this.a * (1 - this.ee)) / (magic * sqrtMagic) * Math.PI);
        const dLng = (WGS84transformer.transformLng(wgLng - 105.0, wgLat - 35.0) * 180.0) / (this.a / sqrtMagic * Math.cos(radLat) * Math.PI);
        return {lat: wgLat + dLat, lng: wgLng + dLng};
    }

    static isOutOfMainlandChina(lat, lng) {
        if (lat >= 21.8 && lat <= 25.3 && lng >= 120.0 && lng <= 122.0) return true;
        if (lng < 72.004 || lng > 137.8347) return true;
        if (lat < 0.8293 || lat > 55.8271) return true;
        return false;
    }

    static transformLat(x, y) {
        let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin(y / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * Math.PI) + 320 * Math.sin(y * Math.PI / 30.0)) * 2.0 / 3.0;
        return ret;
    }

    static transformLng(x, y) {
        let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin(x / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * Math.PI) + 300.0 * Math.sin(x / 30.0 * Math.PI)) * 2.0 / 3.0;
        return ret;
    }
}
/////////// end WGS84 to GCJ-02 transformer /////////

const wgstogcj = new WGS84transformer();

const app = {
    data: {},
    online_url: 'https://aqmh.azurewebsites.net',

    // Application Constructor
    initialize: function () {
        // init map view
        this.map = new AMap.Map('amap');
        this.map.plugin(['AMap.ToolBar', 'AMap.Scale'], () => {
            this.map.addControl(new AMap.ToolBar());
            this.map.addControl(new AMap.Scale());
        });
        this.switchTab('map');
        // init geolocation
        this.location = {
            circle: new AMap.Marker({
                map: app.map,
                offset: new AMap.Pixel(-11.5, -11.5),
                icon: 'img/loc.png',
                zIndex: 200,
                visible: false
            }),
            firstFix: true
        };
        // init mission suggest
        this.loadRecent();
        this.loadSaved();
        this.loadTrending();
        // finish initialization
        if (window.location.href.startsWith('http')) {
            // online version
            this.datasrc = '.';
            this.onDeviceReady();
        } else {
            this.datasrc = 'https://ingressmm.com'; // for compatibility
            document.addEventListener('deviceready', this.onDeviceReady, false);
        }
    },

    // deviceready Event Handler
    onDeviceReady: function () {
        if (window.AMapBridge) {
            // Android client
            setInterval(() => {
                AMapBridge.getLocation(result => {
                    if (!result.lat || !result.lng) return;
                    this.updateLocation(result.lat, result.lng);
                });
            }, 1000);
        } else {
            // other browsers
            setInterval(() => {
                navigator.geolocation.getCurrentPosition(result => {
                    if (result.coords.accuracy == null) return;
                    const pos = wgstogcj.transform(result.coords.latitude, result.coords.longitude);
                    this.updateLocation(pos.lat, pos.lng);
                }, null, {
                    enableHighAccuracy: true
                });
            }, 1000);
        }
        // Device orientation
        if (navigator.compass) {
            this.location.circle.setIcon('img/loc_o.png');
            this.location.circle.setOffset(new AMap.Pixel(-11.5, -13.5));
            navigator.compass.watchHeading((heading) => {
                this.location.circle.setAngle(heading.magneticHeading);
            }, null, {
                frequency: 100
            });
        }
        // load versions
        $('#local_ver').load('version.html')
            .done(() => {
                $('#online_ver').load(`${app.online_url}/version.html`)
                    .done(result => {
                        if (window.AMapBridge && result && result != $('#local_ver').html()) {
                            $('#update').show();
                        }
                    });
            });
    },

    finishLoading: function () {
        this.switchTab('mission');
        $('#loading').hide();
        const query = location.hash.match(/^#q=([^&]+)(&qt=)*([^&]*)$/i);
        if (query) {
            this.performSearch(decodeURIComponent(query[1]), decodeURIComponent(query[3]));
        }
    },

    switchTab: tabName => {
        $('.container').hide();
        $(`#${tabName}_container`).show();

        $('nav').find('section').each(function () {
            if ($(this).attr('data-item') == tabName) {
                $(this).addClass('activate');
            } else {
                $(this).removeClass('activate');
            }
        });
    },

    updateLocation: function (lat, lng) {
        this.location.lat = lat;
        this.location.lng = lng;
        this.calcDistance();
        this.location.circle.setPosition([lng, lat]);
        this.location.circle.show();
        if (this.location.firstFix) {
            this.map.setZoomAndCenter(16, [lng, lat]);
            this.location.firstFix = false;
            $('#skip').hide();
            setTimeout(this.finishLoading, 1000);
        }
    },

    loadList: function (url, type) {
        if (!type) {
            type = 'ingressmm';
        }
        $('#mission_suggest, #mission_preview, #btn_list_preview').hide();
        $('#mission_list').show();
        $('#mission_list_content').html('Loading ...');
        $.get(url).always(this.data[type].parseList);
    },

    loadListCallback: function (result) {
        const list = $('#mission_list_content');
        if (!result || result.length == 0) {
            list.html('No Result _(:з」∠)_');
            return;
        }
        this.list = result;

        let content = '';
        for (let i = 0; i < this.list.length; i++) {
            const mission = this.list[i];
            let type = 'Hidden';
            if (mission.seq == 1) {
                type = 'Sequential';
            } else if (mission.seq == 2) {
                type = 'Any Order';
            } else if (mission.seq == 9) {
                type = 'Unknown';
            }
            const gcjPos = wgstogcj.transform(mission.lat, mission.lng);
            content += `
                <div class="mission" data-index="${i}">
                    <img src="${mission.icon}">
                    <div>
                        <div>${mission.name}</div>
                        <div>${type}<span class="distance" data-lat="${gcjPos.lat}" data-lng="${gcjPos.lng}"></span></div>
                    </div>
                </div>
            `;
        }
        list.html(content);
        this.calcDistance();

        if (this.list.length % 6 == 0) {
            $('#btn_list_preview').show();
        }
    },

    loadMission: function (index, show) {
        $('#mission_detail_info').html($('#mission_list_content').children().eq(index).html());
        const list = $('#mission_waypoints');
        list.html('Loading mission waypoints ...');

        const mission = this.list[index];
        this.data[mission.type].getPortals(mission, result => {
            let content = '';

            if (this.map.markers) {
                this.map.remove(this.map.markers);
            }
            this.map.markers = [];
            let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

            if (!result || result.length == 0) {
                list.html('Failed to fetch mission detail _(:з」∠)_');
            } else for (let i = 0; i < result.length; i++) {
                const waypoint = result[i];
                content += `<div class="waypoint"><div>${i + 1}. `;

                const task_list = [
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
                    content += 'Waypoint Hidden</div>';
                } else {
                    content += `${waypoint.name}</div>`;
                    const gcjPos = wgstogcj.transform(waypoint.lat, waypoint.lng);
                    if (gcjPos.lat < minLat) minLat = gcjPos.lat;
                    if (gcjPos.lat > maxLat) maxLat = gcjPos.lat;
                    if (gcjPos.lng < minLng) minLng = gcjPos.lng;
                    if (gcjPos.lng > maxLng) maxLng = gcjPos.lng;
                    content += `
                        <div>${task_list[waypoint.task]}</div>
                        <div>
                            <span class="distance" data-lat="${gcjPos.lat}" data-lng="${gcjPos.lng}"></span>
                            <a href="https://www.ingress.com/intel?ll=${waypoint.lat},${waypoint.lng}" target="_blank">Intel</a>
                            <a href="javascript:">Walk</a>
                            <a href="javascript:">Ride</a>
                            <a href="javascript:">Drive</a>
                            <a href="javascript:">Transit</a>
                        </div>
                    `;
                    this.map.markers.push(new AMap.Marker({
                        map: this.map,
                        position: [gcjPos.lng, gcjPos.lat],
                        offset: new AMap.Pixel(-12, -12),
                        content: `<div class="waypoint_marker">${(Number(i) + 1)}</div>`
                    }));
                }
                content += '</div>';
            }
            list.html(content);

            const show_map = () => {
                $('#mission_switch').show().find('span').html(mission.name).parent().attr('data-index', index);
                this.map.setBounds(new AMap.Bounds([minLng, minLat], [maxLng, maxLat]));
                this.switchTab('map');
            };
            $('#btn_show_map').click(show_map).show();
            if (show) {
                show_map();
            }
            this.calcDistance();
        });
    },

    performSearch: function (key, type) {
        if (!type) {
            type = 'ingressmm';
        }
        const search_box = $('#mission_search_box');
        search_box.find('input').val(key);
        search_box.find('select').val(type);
        key = encodeURIComponent(key);
        location.hash = `q=${key}&qt=${type}`;
        this.data[type].search(key);
    },

    calcDistance: function () {
        if (!this.location.lng || !this.location.lat) return;
        const _this = this;
        $('.distance').each(function () {
            const [lat, lng] = [Number($(this).attr('data-lat')), Number($(this).attr('data-lng'))];
            $(this).html(`${Math.ceil(new AMap.LngLat(lng, lat).distance([_this.location.lng, _this.location.lat]))}m`);
        });
    },

    loadRecent: () => {
        const list = $('#recent_list');
        list.html('No recent searches');
        if (!localStorage.recent_search) return;
        try {
            const recent = JSON.parse(localStorage.recent_search);
            let content = '';
            for (let i in recent) {
                content = `<div data-name="${recent[i].key}" data-type="${recent[i].type}"><a href="javascript:">${recent[i].key} (${recent[i].type})</a></div>${content}`;
            }
            list.html(content);
        } catch (e) {
        }
    },

    loadSaved: () => {
        const list = $('#saved_list');
        list.html('No saved searches');
        if (!localStorage.saved_search) return;
        try {
            const saved = JSON.parse(localStorage.saved_search);
            let content = '';
            for (let key in saved) {
                content = `<div data-name="${saved[key].key}" data-type="${saved[key].type}" data-key="${key}"><a href="javascript:">${key} (${saved[key].type})</a> <a href="javascript:">[Delete]</a></div>${content}`;
            }
            list.html(content);
        } catch (e) {
        }
    },

    loadTrending: function () {
        $.getScript(`${this.online_url}/trending.aq`);
    }
};

$(() => {
    // init loading
    $('#skip').click(() => {
        app.location.firstFix = false;
        app.finishLoading();
    });

    // init nav bar
    $('nav').find('section').click(function () {
        if ($(this).hasClass('activate')) return;
        app.switchTab($(this).attr('data-item'));
    });

    // init mission search
    const search_box = $('#mission_search_box');
    const search_submit = () => {
        const key = $.trim(search_box.find('input').val());
        const type = search_box.find('select').val();
        if (key == '') return;
        $('#mission_list, #btn_list_save').show();
        app.performSearch(key, type);
        // save to recent searches
        let data = [];
        if (localStorage.recent_search) {
            try {
                data = JSON.parse(localStorage.recent_search);
            } catch (e) {
            }
        }
        const search = {key: key, type: type};
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
    search_box.find('input').keypress(e => {
        if (e.which == 13) {
            search_submit();
        }
    });

    // init mission suggest
    $('#saved_list, #recent_list').on('click', 'a:first-child', function () {
        const name = $(this).parent().attr('data-name');
        const type = $(this).parent().attr('data-type');
        app.performSearch(name, type);
    });

    $('#saved_list').on('click', 'a:last-child', function () {
        if (confirm("Are you sure to delete?")) {
            const key = $(this).parent().attr('data-key');
            try {
                const saved = JSON.parse(localStorage.saved_search);
                delete saved[key];
                localStorage.saved_search = JSON.stringify(saved);
            } catch (e) {
            }
        }
        app.loadSaved();
    });

    // init mission list
    $('#btn_list_back').click(() => {
        location.hash = '';
        $('#btn_list_save, #mission_list').hide();
        $('#mission_suggest').show();
    });

    $('#btn_list_save').click(() => {
        const input = search_box.find('input').val();
        const type = search_box.find('select').val();
        const name = prompt("Save as :", input);
        if (!name) return;
        let data = {};
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

    $('#btn_list_preview').click(() => {
        $('#mission_list').hide();
        let content = '';
        for (let i = 0; i < app.list.length; i++) {
            content = `<img src="${app.list[i].icon}">${content}`;
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
        const new_index = Number($(this).parent().attr('data-index')) + Number($(this).attr('data-delta'));
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
        let content = '';
        const container = $('#mission_preview_content'),
            children = container.children();
        for (let i = 0; i < children.length; i++) {
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
        if ($(this).html() == 'Intel') return;
        if (!app.location.lng || !app.location.lat) {
            alert('No location');
            return;
        }
        if (app.transport) {
            app.transport.clear();
        }
        AMap.service(['AMap.Walking', 'AMap.Riding', 'AMap.Driving', 'AMap.Transfer'], () => {
            const param = {
                map: app.map,
                panel: 'route_container',
                showTraffic: true,
                city: 'undefined',
                nightflag: true
            };
            switch ($(this).html()) {
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
            const target = $(this).parent().find('.distance');
            app.transport.search([app.location.lng, app.location.lat],
                [Number(target.attr('data-lng')), Number(target.attr('data-lat'))],
                (status, result) => {
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
    const hm = document.createElement("script");
    hm.src = "//hm.baidu.com/hm.js?f4d807d64f88ea0422d095decf0430f4";
    const s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(hm, s);
})();