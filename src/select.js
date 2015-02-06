(function() {
    // constructor
    gryst.Select = function(fieldOrFunc, tableID, $tables, $getJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.tableID = tableID;
        if (typeof(fieldOrFunc) == 'function') {
            this.func = fieldOrFunc;
            this.params = gryst.common.getParamNames(fieldOrFunc);
            if (this.params.length === 0) throw "Select function has no parameters.";
        }
        else {
            this.params = fieldOrFunc;
        }
    };

    gryst.Select.$inject = ['$tables', '$getJoinMap'];

    gryst.Select.prototype = {
        run:function() {
            var self = this;
            var val, args, joinMap = this.getJoinMap();
            this.tableID = this.tableID || gryst.common.createTableID(this.tables);

            this.tables[this.tableID] = [];

            // getFieldRefs will fail if there's no data
            // so return early if joinMap is empty
            if (joinMap.length == 0) {
                return this.tables[this.tableID];
            }

            // this has to done here because tables can be created dynamically by other ops
            var fields = gryst.common.getFieldRefs(this.params, this.tables);

            if (this.func) {
                joinMap.forEach(function(mapping) {
                    args = gryst.common.getArguments(fields, mapping);
                    val = self.func.apply(self, args);
                    self.tables[self.tableID].push(val);
                });
            }
            else {
                joinMap.forEach(function(mapping) {
                    // construct an object from the fieldRefs
                    obj = {};
                    if (fields.length == 1) {
                        // if there's only one argument, don't bother wrapping it in an object
                        obj = gryst.common.getArgForMapping(fields[0], mapping);
                    }
                    else {
                        fields.forEach(function(fieldRef){
                            obj[fieldRef.toString()] = gryst.common.getArgForMapping(fieldRef, mapping);
                        });
                    }

                    self.tables[self.tableID].push(obj);
                });
            }

            return this.tables[this.tableID];
        }
    };

})();