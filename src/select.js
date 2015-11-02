(function(common) {
    // constructor
    gryst.Select = function(fieldOrFunc, tableID, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.tableID = tableID;
        if (typeof(fieldOrFunc) == 'function') {
            this.func = fieldOrFunc;
            this.params = common.getParamNames(fieldOrFunc);
            if (this.params.length === 0) throw "Select function has no parameters.";
        }
        else {
            this.params = fieldOrFunc;
        }
    };

    gryst.Select.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.Select.prototype = {
        run:function() {
            var self = this;
            var obj, val, args, newMap = [], joinMap = this.getJoinMap();
            this.tableID = this.tableID || common.createTableID(this.tables);

            gryst.log('Select: table ID:' + this.tableID);

            this.tables[this.tableID] = [];

            // getFieldRefs will fail if there's no data
            // so return early if joinMap is empty
            if (joinMap.length == 0) {
                gryst.log('Select: empty join map');
                return this.tables[this.tableID];
            }

            gryst.log('Select: params:');
            gryst.log(this.params);
            gryst.log('Select: tables:');
            gryst.log(this.tables);

            // this has to done here because tables can be created dynamically by other ops
            var fields = common.getFieldRefs(this.params, this.tables);

            gryst.log('Select: fields:');
            gryst.log(fields);

            if (this.func) {
                joinMap.forEach(function(mapping) {
                    args = common.getArguments(fields, mapping);
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
                        obj = fields[0].getArgForMapping(mapping);
                    }
                    else {
                        fields.forEach(function(fieldRef){
                            obj[fieldRef.name] = fieldRef.getArgForMapping(mapping);
                        });
                    }

                    self.tables[self.tableID].push(obj);
                });
            }

            // create a new join map
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