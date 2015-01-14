(function() {
    // constructor
    gryst.Sort = function(field, desc, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.field = field;
        this.desc = desc;
        this.childSort = null;
        this.type = null;
        this.isRoot = true;
    };

    gryst.Sort.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    var Sort_pf = {
        getSortType:function(fieldRef) {
            // discover the type of sort to apply
            var i, t, key;
            if (fieldRef.table.length > 0) {
                // iterate through the table until we find a non-null value
                key = null;
                for (i = 0; i < fieldRef.table.length && gryst.common.isEmpty(key); i++) {
                    key = fieldRef.table[i][fieldRef.field];
                }
                if (!gryst.common.isEmpty(key)) {
                    t = gryst.common.detectType(key);
                    switch (t) {
                        case 'number':
                        case 'date':
                            return t;
                        default:
                            return 'string'
                    }
                }
            }
        },
        getSortFunction:function(fieldRef, type) {
            // the sort functions look up the key for a given row index and sort by that key
            if (type === 'number' || type === 'date') {
                if (this.desc === true) {
                    return function(mapping1,mapping2){
                        var key1 = Sort_pf.getKeyForMapping(fieldRef, mapping1);
                        var key2 = Sort_pf.getKeyForMapping(fieldRef, mapping2);
                        return key2 - key1;
                    };
                }
                else {
                    return function(mapping1,mapping2){
                        var key1 = Sort_pf.getKeyForMapping(fieldRef, mapping1);
                        var key2 = Sort_pf.getKeyForMapping(fieldRef, mapping2);
                        return key1 - key2;
                    };
                }
            }
            else {
                // sort by string
                if (this.desc === true) {
                    return function(mapping1,mapping2){
                        var key1 = Sort_pf.getKeyForMapping(fieldRef, mapping1);
                        var key2 = Sort_pf.getKeyForMapping(fieldRef, mapping2);
                        if (key1 > key2) {
                            return -1;
                        }
                        if (key1 < key2) {
                            return 1;
                        }
                        return 0;
                    };
                }
                else {
                    return function(mapping1,mapping2){
                        var key1 = Sort_pf.getKeyForMapping(fieldRef, mapping1);
                        var key2 = Sort_pf.getKeyForMapping(fieldRef, mapping2);
                        if (key1 > key2) {
                            return 1;
                        }
                        if (key1 < key2) {
                            return -1;
                        }
                        return 0;
                    };
                }
            }
        },
        getKeyForMapping:function(fieldRef, mapping) {
            var index = mapping[fieldRef.id];
            return fieldRef.table[index][fieldRef.field];
        },
        getSubMaps:function(joinMap, fieldRef) {
            var self = this;
            var subMaps = [];
            var key, keys = [];
            var keyTracker = new Map();

            // split up the join map by this sort's keys

            joinMap.forEach(function(mapping){
                key = Sort_pf.getKeyForMapping(fieldRef, mapping);
                // has the current key changed?
                if (!keyTracker.hasOwnProperty(key)) {
                    // I don't trust the Map to preserve the order
                    // so use an array of keys to ensure order
                    keys.push(key);
                    keyTracker[key] = [];
                }
                keyTracker[key].push(mapping);
            });

            keys.forEach(function(key){
                subMaps.push(keyTracker[key]);
            });

            return subMaps;
        }
    };

    gryst.Sort.prototype = {
        setChild: function(sort) {
            if (this.childSort == null) {
                sort.isRoot = false;
                this.childSort = sort;
            }
            else {
                this.childSort.setChild(sort);
            }
        },
        run: function(joinMap) {
            var self = this;
            var fieldRef = gryst.common.getField(this.field, this.tables);
            var type = Sort_pf.getSortType(fieldRef);

            if (type == null) {
                // the column is empty, no need to bother sorting
                // pass it on to the child sort if it exists
                if (this.childSort != null) {
                     return this.childSort.run(joinMap);
                }
                return joinMap;
            }

            var sortFunction = Sort_pf.getSortFunction(fieldRef, type);
            var subMaps, newJoinMap;

            // joinMap will be undefined on the first sort in the chain
            if (!joinMap) {
                joinMap = this.getJoinMap();
            }

            if (joinMap.length < 2) {
                // there's nothing to sort
                return joinMap;
            }

            joinMap.sort(sortFunction);

            // recurse
            if (this.childSort != null) {
                newJoinMap = [];
                subMaps = Sort_pf.getSubMaps.call(this, joinMap, fieldRef);
                subMaps.forEach(function(subMap){
                    if (subMap.length > 1) {
                        subMap = self.childSort.run(subMap);
                    }
                    newJoinMap = newJoinMap.concat(subMap);
                });
                joinMap = newJoinMap;
            }

            if (this.isRoot) {
                this.setJoinMap(joinMap);
            }

            return joinMap;
        }
    };

})();