(function(common) {

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
            gryst.log('From: tableID: ' + this.tableID);
            // build the master join map
            var self = this;
            var props, obj, newMap, joinMap = this.getJoinMap();
            var table = this.tables[this.tableID];

            if (table === undefined) {
                throw 'From: table is undefined';
            }

            if (joinMap.length == 0) {
                gryst.log('From: creating join map');
                table.forEach(function (row, index) {
                    obj = {};
                    obj[self.tableID] = index;
                    joinMap.push(obj);
                });
                gryst.log('From: join map length: ' + joinMap.length);
            }
            else {
                gryst.log('From: cross join');
                // cross join
                newMap = [];
                joinMap.forEach(function(mapping){
                    props = Object.getOwnPropertyNames(mapping);
                    table.forEach(function(row, index){
                        obj = {};
                        props.forEach(function(prop){
                            obj[prop] = mapping[prop];
                        });
                        obj[self.tableID] = index;
                        newMap.push(obj);
                    });
                });
                gryst.log('From: new join map length: ' + newMap.length);
                this.setJoinMap(newMap);
                return newMap;
            }
            return joinMap;
        }
    };

})(gryst.common);