app.data.mosaik = {
    search: function (key) {
        app.loadList((app.datasrc == '.' ? '.' : app.online_url) + '/get_mission_mosaik.php?find=' + key, 'mosaik');
    },

    parseList: function (result) {
        var list = [];
        try {
            var json = JSON.parse(result);
            for (var i in json) {
                var json2 = JSON.parse(json[i]);
                for (var j in json2[4][0]) {
                    var mission = json2[4][0][j];
                    var portals = [];
                    for (var k in mission.data.waypoints) {
                        var po = mission.data.waypoints[k];
                        if (po.data[0] == 0) {
                            portals.push({
                                hidden: true
                            });
                        } else {
                            portals.push({
                                hidden: false,
                                task: po.data[0],
                                name: po.data[1],
                                lat: po.latLng[0],
                                lng: po.latLng[1]
                            });
                        }
                    }
                    list.push({
                        type: 'mosaik',
                        name: mission.data.dap,
                        seq: 3,
                        lat: mission.latLng[0],
                        lng: mission.latLng[1],
                        icon: mission.data.image,
                        waypoints: portals
                    });
                }
            }
        } catch (e) {
            app.loadListCallback(false);
        }
        app.loadListCallback(list);
    },

    getPortals: function (mission, callback) {
        callback(mission.waypoints);
    }
};