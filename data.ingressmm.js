app.data.ingressmm = {
    search: function (key) {
        app.loadList(app.datasrc + '/get_mission.php?find=' + key + '&findby=0', 'ingressmm');
    },

    parseList: function (result) {
        var list = [];
        try {
            var json = JSON.parse(result);
            // Smart Sort
            var getNum = function (name) {
                name = name.replace(/[\s-]/g, "");
                var regs = [/[(（\[]*(\d+)[/)）\]]/i, /(\d+)$/i];
                for (var i in regs) {
                    var matches = name.match(regs[i]);
                    if (matches && matches.length >= 2)
                        return Number(matches[1]);
                }
                return false;
            };
            for (var key in json.mission) {
                list.push({
                    type: 'ingressmm',
                    id: json.mission[key].id,
                    name: json.mission[key].name,
                    number: getNum(json.mission[key].name),
                    seq: json.mission[key].sequence,
                    lat: json.mission[key].latitude,
                    lng: json.mission[key].longitude,
                    icon: 'https://ingressmm.com/icon/' + json.mission[key].code + '.jpg'
                });
            }
            list = list.sort(function (a, b) {
                if (a.number == b.number) return (a.name > b.name ? 1 : -1);
                if (a.number === false) return 1;
                if (b.number === false) return -1;
                return a.number - b.number;
            });
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