(function() {
    // constructor
    gryst.JoinMap = function(joinMap, $tables) {
        var self = this;
        //var keysRemoved = false;
        this.tables = $tables;
        this.map = joinMap;

        this.run = function() {
            var prop, obj, result = [];

            var props = this.map.length > 0 ? Object.getOwnPropertyNames(this.map[0]) : null;

            if (props) {
                if (props.length == 1) {
                    // if there's only one table represented in the map
                    // then simplify the structure of the returned array
                    prop = props[0];
                    this.map.forEach(function(mapping){
                        obj = self.tables[prop][mapping[prop]];
                        result.push(obj);
                    });
                }
                else {
                    this.map.forEach(function(mapping){
                        obj = {};
                        props.forEach(function(prop){
                            obj[prop] = self.tables[prop][mapping[prop]];
                        });
                        result.push(obj);
                    });

                }
            }
            return result;
        };
    };

    gryst.JoinMap.$inject = ['$tables'];

})();