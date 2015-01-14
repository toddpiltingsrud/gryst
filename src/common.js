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
    getArguments: function(fieldRefs, mapping) {
        // return the args in the order they appear in fieldRefs
        var index, args = [];
        fieldRefs.forEach(function(fieldRef){
            index = mapping[fieldRef.id];
            // it's either a table or a field
            if (fieldRef.field == undefined) {
                // return the entire row
                args.push(fieldRef.table[index]);
            }
            else {
                // return a field within the row
                args.push(fieldRef.table[index][fieldRef.field]);
            }
        });
        return args;
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
    cloneObj:function(obj, target) {
        var name, newObj = target || {};
        for (name in obj) {
            if (obj.hasOwnProperty(name)) {
                newObj[name] = obj[name];
            }
        }
        return newObj;
    },
    detectType:function(a) {
        if (a == null) {
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
    isEmpty: function(val) {
        return val == undefined || val == null;
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
        var i, split = field.split('.');
        if (split.length == 1) {
            // it's either a table or a field name
            // look for a table first
            if (tables[split[0]] != undefined) {
                return {
                    id:split[0],
                    table:tables[split[0]],
                    toString:function(){return field;}
                };
            }
            // look for a field name
            var props = Object.getOwnPropertyNames(tables);
            for (i = 0; i < props.length; i++) {
                // check the first row of each table for the field
                if (tables[props[i]].length > 0 && tables[props[i]][0][split[0]] != undefined) {
                    return {
                        id:props[i],
                        field:split[0],
                        table:tables[props[i]],
                        toString:function(){return field;}
                    };
                }
            }
            throw "Could not resolve field reference: " + field;
        }
        return {
            id:split[0],
            field: split[1],
            table: tables[split[0]],
            toString:function(){return field;}
        };
    },
    getRow: function(fieldRef, mapping) {
        return fieldRef.table[mapping[fieldRef.id]];
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
