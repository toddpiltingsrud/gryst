(function() {
    // constructor
    gryst.Group = function(group, key, groupID, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.tableID = groupID;
        if (typeof(group) == 'function') {
            this.groupFunc = group;
            this.groupFuncParams = gryst.common.getParamNames(group);
        }
        else {
            this.groupFuncParams = group;
        }
        if (typeof(key) == 'function') {
            this.keyFunc = key;
            this.keyFuncParams = gryst.common.getParamNames(key);
        }
        else {
            this.keyFuncParams = key;
        }
    };

    gryst.Group.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.Group.prototype = {
        run:function() {
            var self = this;
            var args, obj, key, newMap;
            var joinMap = this.getJoinMap();
            var keyFields = gryst.common.getFieldRefs(this.keyFuncParams, this.tables);
            var groupFields = gryst.common.getFieldRefs(this.groupFuncParams, this.tables);
            var grouping = new gryst.Grouping();
            // define the table in case we return early
            this.tables[this.tableID] = [];

            if (joinMap.length == 0) {
                return this.tables[this.tableID];
            }

            if (this.keyFunc) {
                joinMap.forEach(function(mapping){
                    args = gryst.common.getArguments(keyFields, mapping);
                    // the only reason we're using apply is to pass in an array of args
                    key = self.keyFunc.apply(self, args);
                    grouping.addKey(key, mapping);
                });
            }
            else {
                joinMap.forEach(function(mapping) {
                    args = gryst.common.getArguments(keyFields, mapping);
                    key = {};
                    keyFields.forEach(function(field, index){
                        if (field.field) {
                            key[field.field] = args[index];
                        }
                        else {
                            gryst.common.cloneObj(args[index], key);
                        }
                    });
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

})();