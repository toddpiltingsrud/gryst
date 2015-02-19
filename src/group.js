(function(common) {
    // constructor
    gryst.Group = function(group, key, groupID, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.tableID = groupID;
        if (typeof(group) == 'function') {
            this.groupFunc = group;
            this.groupFuncParams = common.getParamNames(group);
        }
        else {
            this.groupFuncParams = group;
        }
        if (typeof(key) == 'function') {
            this.keyFunc = key;
            this.keyFuncParams = common.getParamNames(key);
        }
        else {
            this.keyFuncParams = key;
        }
    };

    gryst.Group.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.Group.prototype = {
        run:function() {
            // define the table in case we return early
            this.tables[this.tableID] = [];

            var joinMap = this.getJoinMap();
            if (joinMap.length == 0) {
                return this.tables[this.tableID];
            }

            var self = this;
            var args, obj, key, newMap;
            var keyFields = common.getFieldRefs(this.keyFuncParams, this.tables);
            var groupFields = common.getFieldRefs(this.groupFuncParams, this.tables);
            var grouping = new gryst.Grouping();

            if (this.keyFunc) {
                joinMap.forEach(function(mapping){
                    args = common.getArguments(keyFields, mapping);
                    // using apply to pass in an array of args
                    key = self.keyFunc.apply(self, args);
                    grouping.addKey(key, mapping);
                });
            }
            else {
                joinMap.forEach(function(mapping) {
                    if (keyFields.length === 1) {
                        key = keyFields[0].getArgForMapping(mapping);
                    }
                    else {
                        // construct an object from the key fieldRefs
                        key = {};
                        keyFields.forEach(function(fieldRef){
                            key[fieldRef.name] = fieldRef.getArgForMapping(mapping);
                        });
                    }
                    grouping.addKey(key, mapping);
                });
            }

            this.tables[this.tableID] = grouping.getResult(groupFields, this.groupFunc);

            // rebuild the join map
            newMap = [];
            this.tables[this.tableID].forEach(function(row, index){
                obj = {};
                obj[self.tableID] = index;
                newMap.push(obj);
            });
            this.setJoinMap(newMap);

            return this.tables[this.tableID];
        }
    };

})(gryst.common);