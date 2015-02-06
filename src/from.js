(function() {

    // shortcut for instantiating a new query
    gryst.from = function(table, id) {
        return new gryst.Query().from(table, id);
    };

    // constructor
    gryst.From = function(tableID, $tables, $getJoinMap, $setJoinMap) {
        this.tableID = tableID;
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
    };

    gryst.From.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.From.prototype = {
        run:function() {
            // build the master join map
            var self = this;
            var obj, newMap, joinMap = this.getJoinMap();
            var table = this.tables[this.tableID];

            if (joinMap.length == 0) {
                table.forEach(function(row, index){
                    obj = {};
                    obj[self.tableID] = index;
                    joinMap.push(obj);
                });
            }
            else {
                // cross join
                newMap = [];
                joinMap.forEach(function(mapping){
                    table.forEach(function(row, index){
                        obj = gryst.common.cloneObj(mapping);
                        obj[self.tableID] = index;
                        newMap.push(obj);
                    });
                });
                this.setJoinMap(newMap);
                return newMap;
            }
            return joinMap;
        }
    };

})();