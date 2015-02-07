(function(common) {
    // constructor
    gryst.Distinct = function(func, $tables, $getJoinMap, $setJoinMap) {
        this.func = func;
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
    };

    gryst.Distinct.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.Distinct.prototype = {
        run:function() {
            var joinMap = this.getJoinMap();
            if (joinMap.length === 0) {
                return joinMap;
            }
            var bool, key, keys, self = this;
            var newMap = [];
            var tableIDs = Object.getOwnPropertyNames(joinMap[0]);

            if (this.func) {
                // use the user-supplied function to determine uniqueness
                keys = [];
                joinMap.forEach(function(mapping){
                    bool = false;
                    if (tableIDs.length === 1) {
                        // if there's only one table, don't wrap it in an object
                        key = self.tables[tableIDs[0]][mapping[tableIDs[0]]];
                    }
                    else {
                        // create an object from the mapping
                        key = {};
                        tableIDs.forEach(function(id){
                            // grab the entire row and store it in key
                            key[id] = self.tables[id][mapping[id]];
                        });
                    }

                    // see if there's already a key that matches
                    for (i = 0; i < keys.length; i++) {
                        // if the user's func says they're equal, move on
                        if (self.func(keys[i], key)){
                            bool = true;
                            break;
                        }
                    }
                    if (bool == false) {
                        keys.push(key);
                        newMap.push(mapping);
                    }
                });
            }
            else {
                keys = {};
                // if no arguments are supplied, operate against the entire join map

                joinMap.forEach(function(mapping){
                    key = {};
                    // create an object from all the rows referenced by this mapping
                    tableIDs.forEach(function(id){
                        // grab the entire row and store it in obj
                        key[id] = self.tables[id][mapping[id]];
                    });

                    key = common.stringify(key);

                    if (keys.hasOwnProperty(key) === false) {
                        keys[key] = null;
                        newMap.push(mapping);
                    }
                });

            }

            this.setJoinMap(newMap);

            return newMap;

        }
    };

})(gryst.common);
