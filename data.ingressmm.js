app.data.ingressmm = {
    search: function (key) {
        app.loadList(app.datasrc + '/get_mission.php?find=' + key + '&findby=0', 'ingressmm');
    },

    parseList: function (result) {
        var list = [];
        try {
            var json = JSON.parse(result);
            for (var key in json.mission) {
                list.push({
                    type: 'ingressmm',
                    id: json.mission[key].id,
                    name: json.mission[key].name,
                    seq: json.mission[key].sequence,
                    lat: json.mission[key].latitude,
                    lng: json.mission[key].longitude,
                    icon: 'https://ingressmm.com/icon/' + json.mission[key].code + '.jpg'
                });
            }
        } catch (e) {
            app.loadListCallback(false);
        }
        app.loadListCallback(list);
    },

    getPortals: function (mission, callback) {
        $.getJSON(app.datasrc + '/get_portal.php?mission=' + mission.id, function (result) {
            var portals = [];
            if (result.portal) {
                for (var key in result.portal) {
                    var po = result.portal[key];
                    if (po[0]) {
                        portals.push({
                            hidden: true
                        });
                    } else {
                        portals.push({
                            hidden: false,
                            task: po[1],
                            name: po[2].name,
                            lat: po[2].latitude,
                            lng: po[2].longitude
                        });
                    }
                }
            }
            callback(portals);
        });
    }
};