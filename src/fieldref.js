(function() {
    // constructor
    gryst.FieldRef = function(field, tables) {
        var i, split;
        this.id = null;
        this.field = null;
        this.index = null;
        this.table = null;
        this.name = null;
        // default function, can be overridden below
        this.getArgForRow = function(row) {
            return row[this.field];
        };

        // strip spaces
        var f = field.replace(/ /g,'');

        // property reference
        if (f.indexOf('.') != -1) {
            split = f.split('.');
            this.id = split[0];
            this.field = split[1];
            this.table = tables[this.id];
            // use toString to create unique property names
            this.name = this.field;
            return this;
        }

        // array indexer
        if (f.indexOf('[') != -1) {
            split = f.split('[');
            this.id = split[0];
            this.index = parseInt(f.match(/\d+/));
            this.table = tables[this.id];
            this.getArgForRow = function(row) {
                return row[this.index];
            };
            this.name = this.id + "_" + this.index;
            return this;
        }

        // check for table reference
        if (tables[f] != undefined) {
            this.id = f;
            this.table = tables[this.id];
            this.getArgForRow = function(row) {
                return row;
            };
            this.name = this.id;
            return this;
        }

        // look for a field name
        var props = Object.getOwnPropertyNames(tables);
        for (i = 0; i < props.length; i++) {
            // check the first row of each table for the field
            if (tables[props[i]].length > 0 && tables[props[i]][0][f] != undefined) {
                this.id = props[i];
                this.field = f;
                this.table = tables[props[i]];
                this.name = this.field;
                return this;
            }
        }

        throw "Could not resolve field reference: " + field;
    };

    var pf = {
        //addToMap: function(map, key, value) {
        //    // if key is an array then recurse,
        //    // adding multiple copies of value for each key
        //    if (Array.isArray(key)) {
        //        key.forEach(function(k){
        //            gryst.common.addToMap(map, k, value);
        //        });
        //    }
        //    if (map.hasOwnProperty(key)) {
        //        if (Array.isArray(map[key]) === false) {
        //            // convert to array
        //            map[key] = [map[key]];
        //        }
        //        map[key].push(value);
        //    }
        //    else {
        //        map[key] = value;
        //    }
        //}
        addToMap: function(map, key, value) {
            if (map.hasOwnProperty(key)) {
                map[key].push(value);
            }
            else {
                map[key] = [value];
            }
        }
    };

    gryst.FieldRef.prototype = {
        getArg:function(index) {
            var row = this.table[index];
            return this.getArgForRow(row);
        },
        getArgForMapping:function(mapping) {
            var row = this.table[mapping[this.id]];
            return this.getArgForRow(row);
        },
        getMap: function() {
            // create an object with the column values as property names
            // and the array index as the values
            var key, self = this;
            var map = {};
            this.table.forEach(function(row, index){
                key = self.getArgForRow(row);
                if (map.hasOwnProperty(key)) {
                    map[key].push(index);
                }
                else {
                    map[key] = [index];
                }
            });
            return map;
        }

        //getArgForRow: function(row) {
        //    if (this.field !== null) {
        //        // return a field within the row
        //        return row[this.field];
        //    }
        //    if (this.index !== null) {
        //        // return an array index
        //        return row[this.index];
        //    }
        //    // return the entire row
        //    return row;
        //}
    };

})();
