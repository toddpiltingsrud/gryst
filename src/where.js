(function(common){

    // constructor
    gryst.Where = function(func, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.func = func;
        this.params = common.getParamNames(func);
        if (this.params.length === 0) throw "Where function has no parameters.";
    };

    gryst.Where.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.Where.prototype = {
        run:function() {
            var args, bool, self = this;
            var keysRemoved = false;
            var newMap, joinMap = this.getJoinMap();
            // getFieldRefs will fail if there's no data
            // so return early if joinMap is empty
            if (joinMap.length == 0) {
                return joinMap;
            }
            var fieldRefs = common.getFieldRefs(this.params, this.tables);

            joinMap.forEach(function(mapping, index){
                args = common.getArguments(fieldRefs, mapping);
                bool = self.func.apply(self, args);
                if (bool === false) {
                    delete joinMap[index];
                    keysRemoved = true;
                }
            });
            if (keysRemoved) {
                // recreate the join map
                newMap = [];
                Object.keys(joinMap).forEach(function(key){
                    newMap.push(joinMap[key]);
                });
                this.setJoinMap(newMap);
                return newMap;
            }

            return joinMap;
        }
    };

})(gryst.common);