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

                if (tableIDs.length === 1) {
                    joinMap.forEach(function(mapping){
                        key = self.tables[tableIDs[0]][mapping[tableIDs[0]]];

                        // see if there's already a key that matches
                        bool = false;
                        // duplicate keys tend to be close together
                        // so it'll often be faster to start comparing at the end
                        for (i = keys.length - 1; i >= 0 && bool === false; i--) {
                            // if the user's func says they're equal, move on
                            bool = self.func(keys[i], key);
                        }
                        if (bool === false) {
                            keys.push(key);
                            newMap.push(mapping);
                        }
                    });
                }
                else {
                    joinMap.forEach(function(mapping){
                        // create an object from the mapping
                        key = {};
                        tableIDs.forEach(function(id){
                            // grab the entire row and store it in key
                            key[id] = self.tables[id][mapping[id]];
                        });

                        // see if there's already a key that matches
                        bool = false;
                        // duplicate keys tend to be close together
                        // so it'll often be faster to start comparing at the end
                        for (i = keys.length - 1; i >= 0 && bool === false; i--) {
                            // if the user's func says they're equal, move on
                            bool = self.func(keys[i], key);
                        }
                        if (bool === false) {
                            keys.push(key);
                            newMap.push(mapping);
                        }
                    });
                }
            }
            else {
                // if no arguments are supplied, operate against the entire join map
                keys = {};

                if (tableIDs.length === 1) {
                    joinMap.forEach(function(mapping){
                        key = self.tables[tableIDs[0]][mapping[tableIDs[0]]];

                        key = common.stringify(key);

                        keys[key] = mapping;
                    });
                }
                else {
                    joinMap.forEach(function(mapping){
                        key = {};
                        // create an object from all the rows referenced by this mapping
                        tableIDs.forEach(function(id){
                            // grab the entire row and store it in key
                            key[id] = self.tables[id][mapping[id]];
                        });

                        key = common.stringify(key);

                        keys[key] = mapping;
                    });
                }

                Object.getOwnPropertyNames(keys).forEach(function(key){
                    newMap.push(keys[key]);
                });
            }

            this.setJoinMap(newMap);

            return newMap;

        }
    };

})(gryst.common);
