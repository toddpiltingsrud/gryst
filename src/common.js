gryst.common = {
    // http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
    getParamNames: function (func) {
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var ARGUMENT_NAMES = /([^\s,]+)/g;
        var fnStr = func.toString().replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
        if (result === null)
            result = [];
        return result;
    },
    hasValue : function(val) {
        return typeof val != 'undefined' && val !== null;
    },
    isEmpty: function(val) {
        return typeof val == 'undefined' || val === null;
    },
    getArguments: function(fieldRefs, mapping) {
        // return the args in the order they appear in fieldRefs
        var row, args = [];
        var self = this;
        fieldRefs.forEach(function(fieldRef){
            row = fieldRef.table[mapping[fieldRef.id]];
            args.push(self.getArg(fieldRef, row));
        });
        return args;
    },
    getArgForMapping:function(fieldRef, mapping) {
        var row = fieldRef.table[mapping[fieldRef.id]];
        return this.getArg(fieldRef, row);
    },
    getArg: function(fieldRef, row) {
        if (fieldRef.field != undefined) {
            // return a field within the row
            return row[fieldRef.field];
        }
        else if (fieldRef.index != undefined) {
            // return an array index
            return row[fieldRef.index];
        }
        else {
            // return the entire row
            return row;
        }
    },
    addToMap: function(map, key, value) {
        // if key is an array then recurse,
        // adding multiple copies of value for each key
        if (Array.isArray(key)) {
            key.forEach(function(k){
                gryst.common.addToMap(map, k, value);
            });
        }
        if (map.hasOwnProperty(key)) {
            if (Array.isArray(map[key]) === false) {
                // convert to array
                map[key] = [map[key]];
            }
            map[key].push(value);
        }
        else {
            map[key] = value;
        }
    },
    cloneObj:function(obj) {
        //return JSON.parse(JSON.stringify(obj));
        // JSON.parse doesn't handle Dates
        var newObj = {};
        if (this.isEmpty(obj)) {
            return newObj;
        }
        var props = Object.getOwnPropertyNames(obj);
        props.forEach(function(prop){
            newObj[prop] = obj[prop];
        });
        return newObj;
    },
    detectType:function(a) {
        if (a === null) {
            return null;
        }
        var t = typeof(a);
        if (t === 'number' || t === 'string' || t === 'boolean') {
            return t;
        }
        if (a instanceof Date) {
            return 'date';
        }
        if (Array.isArray(a)) {
            return 'array';
        }
        if (t === 'object') {
            return t;
        }
        throw "Could not determine type";
    },
    getFieldRefs:function(fields, tables) {
        var a = [];
        var f = Array.isArray(fields) ? fields : fields.split(',');
        f.forEach(function(field){
            field = field.trim();
            if (field[0] != '$') {
                a.push(gryst.common.getField(field, tables));
            }
        });
        return a;
    },
    getField: function(field, tables) {
        var i, split;
        // property reference
        if (field.indexOf('.') != -1) {
            split = field.split('.');
            return {
                id: split[0],
                field: split[1],
                table: tables[split[0]],
                // use toString to create unique property names
                //toString: function(){return this.id + "_" + this.field;}
                toString: function(){return this.field;}
            };
        }

        // array indexer
        if (field.indexOf('[') != -1) {
            split = field.split('[');
            return {
                id: split[0],
                index: parseInt(field.match(/\d+/)),
                table: tables[split[0]],
                // use toString to create unique property names
                //toString: function(){return this.id + "_" + this.index;}
                toString: function(){return this.id + "_" + this.index;}
            };
        }

        // check for table reference
        if (tables[field] != undefined) {
            return {
                id:field,
                table:tables[field],
                // use toString to create unique property names
                toString: function(){return this.id;}
            };
        }

        // look for a field name
        var props = Object.getOwnPropertyNames(tables);
        for (i = 0; i < props.length; i++) {
            // check the first row of each table for the field
            if (tables[props[i]].length > 0 && tables[props[i]][0][field] != undefined) {
                return {
                    id:props[i],
                    field:field,
                    table:tables[props[i]],
                    //toString:function(){return this.id + "_" + this.field;}
                    toString:function(){return this.field;}
                };
            }
        }

        throw "Could not resolve field reference: " + field;
    },
    l:'abcdefghijklmnopqrstuvwxyz',
    createTableID: function(tables, id) {
        id = id || '';
        var s;
        for (var i = 0; i < gryst.common.l.length; i++) {
            s = id + gryst.common.l[i];
            if (!(s in tables)) {
                return s;
            }
        }
        return gryst.common.createTableID(tables, id + 'a');
    }
};
