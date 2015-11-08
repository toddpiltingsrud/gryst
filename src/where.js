(function(common){

    // constructor
    gryst.Where = function(func, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.func = func;
        this.params = common.getParamNames(func);
        // if there's only one field reference, don't throw an error if it's not resolved
        // instead we'll assume the user wants to reference the last table
        this.throwIfNoFieldRef = this.params.length > 1;
        if (this.params.length === 0) throw "Where function has no parameters.";
    };

    gryst.Where.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.Where.prototype = {
        run: function () {
            var joinMap = this.getJoinMap();
            // getFieldRefs will fail if there's no data
            // so return early if joinMap is empty
            if (joinMap.length == 0) {
                gryst.log('Where: empty join map');
                return joinMap;
            }
            var newMap = [], args, bool, self = this;
            gryst.log('Where: throw if no field refs: ' + this.throwIfNoFieldRef);
            var fieldRefs = common.getFieldRefs(this.params, this.tables, this.throwIfNoFieldRef);

            gryst.log('Where: fieldRefs:');
            gryst.log(fieldRefs);

            if (fieldRefs.length === 1 && fieldRefs[0].isResolved() === false) {
                // assume a reference to the last table
                var tableID = Object.getOwnPropertyNames(this.tables).sort().reverse()[0];
                fieldRefs[0] = new gryst.FieldRef(tableID, this.tables);
                if (fieldRefs[0].isResolved() === false) {
                    throw "Could not resolve field references for where clause: " + this.params.toString();
                }
            }

            gryst.log('Where: fieldRefs:');
            gryst.log(fieldRefs);

            joinMap.forEach(function (mapping) {
                args = common.getArguments(fieldRefs, mapping);
                bool = self.func.apply(self, args);
                if (bool === true) {
                    newMap.push(mapping);
                }
            });

            this.setJoinMap(newMap);

            return newMap;
        }
    };

})(gryst.common);