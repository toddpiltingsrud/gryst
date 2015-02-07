(function() {
    // constructor
    gryst.FieldRef = function(field, tables) {
        var i, split;
        this.id = null;
        this.field = null;
        this.index = null;
        this.table = null;

        // strip spaces
        var f = field.replace(/ /g,'');

        // property reference
        if (f.indexOf('.') != -1) {
            split = f.split('.');
            this.id = split[0];
            this.field = split[1];
            this.table = tables[this.id];
            // use toString to create unique property names
            this.toString = function(){return this.field;};
            return this;
        }

        // array indexer
        if (f.indexOf('[') != -1) {
            split = f.split('[');
            this.id = split[0];
            this.index = parseInt(f.match(/\d+/));
            this.table = tables[this.id];
            // use toString to create unique property names
            //toString: function(){return this.id + "_" + this.index;}
            this.toString = function(){return this.id + "_" + this.index;};
            return this;
        }

        // check for table reference
        if (tables[f] != undefined) {
            this.id = f;
            this.table = tables[this.id];
            // use toString to create unique property names
            this.toString = function(){return this.id;};
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
                //toString:function(){return this.id + "_" + this.field;}
                this.toString = function(){return this.field;};
                return this;
            }
        }

        throw "Could not resolve field reference: " + field;
    };

    gryst.FieldRef.prototype = {
        getRow:function(index) {
            return this.table[index];
        },
        getArg:function(index) {
            var row = this.getRow(index);
            return this.getArgForRow(row);
        },
        getArgForMapping:function(mapping) {
            var row = this.getRow([mapping[this.id]]);
            return this.getArgForRow(row);
        },
        getArgForRow: function(row) {
            if (this.field !== null) {
                // return a field within the row
                return row[this.field];
            }
            else if (this.index !== null) {
                // return an array index
                return row[this.index];
            }
            else {
                // return the entire row
                return row;
            }
        }
    };

})();
