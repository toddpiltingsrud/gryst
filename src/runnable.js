(function(common) {
    // constructor
    gryst.Runnable = function() {
        this.tables = {};
        this.joinMap = [];
        this.ops = [];
        this.result = null;
    };

    gryst.Runnable.prototype = {
        addChildSort: function(sort) {
            // find the last sort
            for (var i = this.ops.length - 1; i >= 0; i--) {
                if (this.ops[i] instanceof gryst.Sort) {
                    this.ops[i].setChild(sort);
                    return;
                }
            }
            // none found, add it as a new operation
            this.ops.push(sort);
        },
        getMap: function(fieldRef) {
            // create an object with the column values as property names
            // and the array index as the values
            var table = this.tables[fieldRef.id];
            var map;
            if (!table.hasOwnProperty("Maps")) {
                table.Maps = {};
            }
            if (table.Maps.hasOwnProperty(fieldRef.toString())) {
                return table.Maps[fieldRef.toString()];
            }
            map = {};
            //map = new Map();
            table.forEach(function(row, index){
                common.addToMap(map, fieldRef.getArgForRow(row), index);
            });
            table.Maps[fieldRef.toString()] = map;
            return map;
        },
        run: function() {
            var self = this;
            this.joinMap = [];
            this.result = null;

            // run all the ops in sequence
            this.ops.forEach(function(op) {
                self.result = op.run();
            });

            if (this.result === this.joinMap) {
                return new gryst.JoinMap(this.joinMap, this.tables).run();
            }

            return this.result;
        }
    };

})(gryst.common);