app.data.aqmh = {
    search: function (key) {
        // TODO not implemented yet
    },

    parseList: function (result) {
        try {
            app.loadListCallback(JSON.parse(result));
        } catch (e) {
            app.loadListCallback(false);
        }
    },

    getPortals: function (mission, callback) {
        if (mission.waypoints) {
            callback(mission.waypoints);
        } else {
            callback(false);
        }
    }
};