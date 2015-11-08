'use strict';

// global namespace
var gryst = gryst || {};

gryst.logging = false;

gryst.log = function (arg) {
    if (gryst.logging) {
        console.log(arg);
    }
};

gryst.agg = {

    max : function(arr, field) {
        var r = arr;
        if (field) {
            r = [];
            arr.forEach(function(a, index) {
                r[index] = arr[index][field];
            });
        }
        return Math.max.apply(this, r);
    },
    min: function(arr, field) {
        var r = arr;
        if (field) {
            r = [];
            arr.forEach(function(a, index) {
                r[index] = arr[index][field];
            });
        }
        return Math.min.apply(this, r);
    },
    avg: function(arr, field) {
        var count = 0, total = 0;
        arr.forEach(function(a){
            count++;
            total += a[field] === null ? 0 : a[field];
        });
        return total / count;
    }

};

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
    countProps:function(obj) {
        var k, count = 0;
        for (k in obj) {
            if (obj.hasOwnProperty(k)) {
                count++;
            }
        }
        return count;
    },
    deepEqual:function(v1, v2) {

        var k, r ;

        if (typeof(v1) !== typeof(v2)) {
            return false;
        }

        if (typeof(v1) === "function") {
            return v1.toString() === v2.toString();
        }

        if (v1 instanceof Object) {
            if (gryst.common.countProps(v1) !== gryst.common.countProps(v2)) {
                return false;
            }
            for (k in v1) {
                r = gryst.common.deepEqual(v1[k], v2[k]);
                if (!r) {
                    return false;
                }
            }
            return true;
        }

        return v1 === v2;
    },
    getFieldRefs:function(fields, tables, thro) {
        var refs = [];
        var f = Array.isArray(fields) ? fields : fields.split(',');
        f.forEach(function(field){
            if (field[0] != '$') {
                refs.push(new gryst.FieldRef(field, tables, thro));
            }
        });
        return refs;
    },
    getArguments: function(fieldRefs, mapping) {
        // return the args in the order they appear in fieldRefs
        var args = [];
        fieldRefs.forEach(function(fieldRef){
            args.push(fieldRef.getArgForMapping(mapping));
        });
        return args;
    },
    getType:function(a) {
        if (a === null) {
            return null;
        }
        if (a instanceof Date) {
            return 'date';
        }
        if (Array.isArray(a)) {
            return 'array';
        }
        // 'number','string','boolean','function','object'
        return typeof(a);
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

gryst.common.stringify = JSON.stringify || function(a) {
    var t, i, props, s = [];
    // this is a recursive function
    // so we have to detect the type on every iteration
    t = gryst.common.getType(a);
    switch(t)
    {
        case null:
            s.push('null');
            break;
        case 'number':
        case 'boolean':
            s.push(a);
            break;
        case 'string':
            s.push('"' + a + '"');
            break;
        case 'date':
            s.push('Date(' + a.getTime() + ')');
            break;
        case 'array':
            s.push('[');
            for (i = 0; i < a.length; i++) {
                if (i > 0) {
                    s.push(',');
                }
                s.push(gryst.common.stringify(a[i]));
            }
            s.push(']');
            break;
        case 'object':
            props = Object.getOwnPropertyNames(a);
            s.push('{');
            for (i = 0; i < props.length; i++) {
                if (i > 0) {
                    s.push(',');
                }
                s.push('"' + props[i] + '":');
                s.push(gryst.common.stringify(a[props[i]]));
            }
            s.push('}');
            break;
        default :
            throw "Could not determine type: " + a;
    }
    return s.join('');
};
(function(common) {
    // constructor
    gryst.Distinct = function(func, $tables, $getJoinMap, $setJoinMap) {
        this.func = func;
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
    };

    gryst.Distinct.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.Distinct.prototype = {
        run:function() {
            var joinMap = this.getJoinMap();
            if (joinMap.length === 0) {
                gryst.log('Distinct: no map');
                return joinMap;
            }
            var bool, key, keys, self = this;
            var newMap = [];
            var tableIDs = Object.getOwnPropertyNames(joinMap[0]);

            if (this.func) {
                // use the user-supplied function to determine uniqueness
                gryst.log('Distinct: using supplied function');
                keys = [];

                if (tableIDs.length === 1) {
                    joinMap.forEach(function(mapping){
                        key = self.tables[tableIDs[0]][mapping[tableIDs[0]]];

                        // see if there's already a key that matches
                        bool = false;
                        // duplicate keys tend to be close together
                        // so it'll often be faster to start comparing at the end
                        for (var i = keys.length - 1; i >= 0 && bool === false; i--) {
                            // if the user's func says they're equal, move on
                            bool = self.func(keys[i], key);
                        }
                        if (bool === false) {
                            keys.push(key);
                            newMap.push(mapping);
                        }
                    });
                }
                else {
                    joinMap.forEach(function(mapping){
                        // create an object from the mapping
                        key = {};
                        tableIDs.forEach(function(id){
                            // grab the entire row and store it in key
                            key[id] = self.tables[id][mapping[id]];
                        });

                        // see if there's already a key that matches
                        bool = false;
                        // duplicate keys tend to be close together
                        // so it'll often be faster to start comparing at the end
                        for (var i = keys.length - 1; i >= 0 && bool === false; i--) {
                            // if the user's func says they're equal, move on
                            bool = self.func(keys[i], key);
                        }
                        if (bool === false) {
                            keys.push(key);
                            newMap.push(mapping);
                        }
                    });
                }
            }
            else {
                // if no arguments are supplied, operate against the entire join map
                gryst.log('Distinct: no arguments, operating against entire map');
                keys = {};

                if (tableIDs.length === 1) {
                    joinMap.forEach(function(mapping){
                        key = self.tables[tableIDs[0]][mapping[tableIDs[0]]];

                        key = common.stringify(key);

                        keys[key] = mapping;
                    });
                }
                else {
                    joinMap.forEach(function(mapping){
                        key = {};
                        // create an object from all the rows referenced by this mapping
                        tableIDs.forEach(function(id){
                            // grab the entire row and store it in key
                            key[id] = self.tables[id][mapping[id]];
                        });

                        key = common.stringify(key);

                        keys[key] = mapping;
                    });
                }

                Object.getOwnPropertyNames(keys).forEach(function(key){
                    newMap.push(keys[key]);
                });
            }

            this.setJoinMap(newMap);

            return newMap;

        }
    };

})(gryst.common);
(function() {
    // constructor
    gryst.FieldRef = function(field, tables, thro) {
        var i, split;
        this.id = null;
        this.field = null;
        this.index = null;
        this.table = null;
        this.name = null;
        if (thro === undefined) {
            thro = true;
        }
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

        if (thro) {
            throw "Could not resolve field reference: " + field;
        }
    };

    gryst.FieldRef.prototype = {
        isResolved: function () {
            return this.table != null;
        },
        getArg: function (index) {
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
                // isArray is faster than hasOwnProperty
                if (Array.isArray(map[key])) {
                    map[key].push(index);
                }
                else {
                    map[key] = [index];
                }
            });
            return map;
        }
    };

})();
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

})(gryst.common);(function(common) {
    // constructor
    gryst.Group = function(group, key, groupID, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.tableID = groupID;
        if (typeof(group) == 'function') {
            this.groupFunc = group;
            this.groupFuncParams = common.getParamNames(group);
        }
        else {
            this.groupFuncParams = group;
        }
        if (typeof(key) == 'function') {
            this.keyFunc = key;
            this.keyFuncParams = common.getParamNames(key);
        }
        else {
            this.keyFuncParams = key;
        }
    };

    gryst.Group.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.Group.prototype = {
        run:function() {
            // define the table in case we return early
            this.tables[this.tableID] = [];

            var joinMap = this.getJoinMap();
            if (joinMap.length == 0) {
                gryst.log('Group: empty join map');
                return this.tables[this.tableID];
            }

            var self = this;
            var args, obj, key, newMap;
            var keyFields = common.getFieldRefs(this.keyFuncParams, this.tables);
            var groupFields = common.getFieldRefs(this.groupFuncParams, this.tables);
            var grouping = new gryst.Grouping();

            if (this.keyFunc) {
                gryst.log('Group: using supplied function');
                joinMap.forEach(function (mapping) {
                    args = common.getArguments(keyFields, mapping);
                    // using apply to pass in an array of args
                    key = self.keyFunc.apply(self, args);
                    grouping.addKey(key, mapping);
                });
            }
            else {
                gryst.log('Group: using keyFields:');
                gryst.log(keyFields);
                joinMap.forEach(function (mapping) {
                    if (keyFields.length === 1) {
                        key = keyFields[0].getArgForMapping(mapping);
                    }
                    else {
                        // construct an object from the key fieldRefs
                        key = {};
                        keyFields.forEach(function(fieldRef){
                            key[fieldRef.name] = fieldRef.getArgForMapping(mapping);
                        });
                    }
                    grouping.addKey(key, mapping);
                });
            }

            this.tables[this.tableID] = grouping.getResult(groupFields, this.groupFunc);

            // rebuild the join map
            newMap = [];
            this.tables[this.tableID].forEach(function(row, index){
                obj = {};
                obj[self.tableID] = index;
                newMap.push(obj);
            });
            this.setJoinMap(newMap);

            return this.tables[this.tableID];
        }
    };


})(gryst.common);(function(common) {
    // constructor
    gryst.Grouping = function() {
        this.keys = [];
        this.coerced = [];
        //this.map = new Map();
        this.map = {};
    };

    // private functions
    var pf = {
        getArgs:function(fieldRefs, mappings) {
            var args, rows = [];
            mappings.forEach(function(mapping){
                args = common.getArguments(fieldRefs, mapping);
                args = args.length == 1 ? args[0] : args;
                rows.push(args);
            });
            return rows;
        }
    };

    gryst.Grouping.prototype = {
        addKey:function(key, mapping) {
            var k = typeof key === 'object' ? common.stringify(key) : key;
            // checking for an array avoids the performance hit of hasOwnProperty
            if (!Array.isArray(this.map[k])) {
                this.map[k] = [mapping];
                // save the original key and the coerced key to parallel arrays
                // so we only have to run the coerceKey function once
                this.keys.push(key);
                this.coerced.push(k);
            }
            else {
                this.map[k].push(mapping);
            }
        },
        getResult:function(groupFields, groupFunc) {
            var mappings, args, obj, arr;
            var i, coercedKey, result = [];

            if (groupFunc) {
                for (i = 0; i < this.keys.length; i++){
                    coercedKey = this.coerced[i];
                    mappings = this.map[coercedKey];
                    args = pf.getArgs(groupFields, mappings);
                    if (groupFields.length == 1) {
                        // set gryst.agg as the context to make aggregations
                        // available to the function through the 'this' keyword
                        arr = groupFunc.call(gryst.agg, args);
                    }
                    else {
                        arr = groupFunc.apply(gryst.agg, args);
                    }
                    result.push({
                        key:this.keys[i],
                        values:arr
                    });
                }
            }
            else {
                for (i = 0; i < this.keys.length; i++){
                    coercedKey = this.coerced[i];
                    mappings = this.map[coercedKey];
                    // getArgs returns an array of rows and/or field values
                    args = pf.getArgs(groupFields, mappings);

                    // convert raw values into objects
                    arr = [];
                    args.forEach(function(arg){
                        obj = {};
                        groupFields.forEach(function(field, index){
                            if (field.field != undefined) {
                                // create a property in obj for the raw field value
                                obj[field.field] = arg[index];
                            }
                            else {
                                // this is an entire row
                                // copy the properties of the row into obj
                                //obj = common.cloneObj(arg);
                                obj = arg;
                            }
                        });
                        arr.push(obj);
                    });
                    result.push({
                        key:this.keys[i],
                        values:arr
                    });
                }
            }

            return result;
        }
    };

})(gryst.common);(function() {
    // constructor
    gryst.Injector = function(host) {
        this.dep = {
            $tables: host.tables,
            $getMap: function(id, field) {
                return host.getMap(id, field);
            },
            $getJoinMap: function() {
                return host.joinMap;
            },
            $setJoinMap: function(map) {
                host.joinMap = map;
            },
            $agg: gryst.agg,
            $injector: this
        };
    };

    gryst.Injector.prototype = {
        inject: function(func, args) {
            args = args || [];
            var params, self = this;
            if (func.$inject) {
                func.$inject.forEach(function(param){
                    if (self.dep.hasOwnProperty(param)) {
                        args.push(self.dep[param]);
                    }
                    else {
                        throw "Unrecognized dependency: " + param;
                    }
                });
            }
            else {
                params = gryst.common.getParamNames(func);
                params.forEach(function (param) {
                    if (self.dep.hasOwnProperty(param)) {
                        args.push(self.dep[param]);
                    }
                });
            }
            return args;
        }
    };

})();(function(common) {
    // constructor
    gryst.Join = function(field1, field2, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        if (common.isEmpty(field1) || common.isEmpty(field2)) {
            throw "Join is missing field references.";
        }
        this.field1 = field1;
        this.field2 = field2;
    };

    gryst.Join.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    // private functions
    var pf = {
        setFieldReferences:function(joinMap) {
            // consult the joinMap to figure out which fields are left and right

            // this has to happen during execution instead of initialization
            // because we need an up to date copy of the joinMap

            if (joinMap.length > 0) {

                if (joinMap[0].hasOwnProperty(this.fieldRef1.id)) {
                    this.leftField = this.fieldRef1;
                    this.rightField = this.fieldRef2;
                }
                else if (joinMap[0].hasOwnProperty(this.fieldRef2.id)) {
                    this.leftField = this.fieldRef2;
                    this.rightField = this.fieldRef1;
                }
                else {
                    throw "Join failed: unable to resolve field references: " + this.field1 + "," + this.field2;
                }
            }
        }
    };

    gryst.Join.prototype = {
        run: function () {
            var joinMap = this.getJoinMap();

            if (joinMap.length == 0) {
                gryst.log('Join: empty join map');
                return joinMap;
            }

            // resolve table references during execution instead of initialization
            // because tables can be dynamically created with other operations
            this.fieldRef1 = new gryst.FieldRef(this.field1, this.tables);
            this.fieldRef2 = new gryst.FieldRef(this.field2, this.tables);

            // determine left side & right side
            pf.setFieldReferences.call(this, joinMap);

            gryst.log('Join: left field:');
            gryst.log(this.leftField);
            gryst.log('Join: right field:');
            gryst.log(this.rightField);

            // construct a new join map
            var self = this;
            var i, indexes, obj, key, newMap = [];
            var props, rightMap = this.rightField.getMap();

            props = Object.getOwnPropertyNames(joinMap[0]);

            joinMap.forEach(function(mapping){

                key = self.leftField.getArgForMapping(mapping);

                indexes = rightMap[key];

                // since we're constructing a completely new map,
                // keys on the left side will be omitted if
                // they do not also exist on the right side
                if (indexes) {
                    // re-use the mapping on the first index
                    // this improves performance by avoiding cloning the mapping
                    // it's also possible that there's only one index anyway
                    mapping[self.rightField.id] = indexes[0];
                    newMap.push(mapping);
                    if (indexes.length > 1) {
                        indexes.shift();
                        indexes.forEach(function(rightIndex){
                            // clone the mapping and add the right index to it
                            obj = {};
                            props.forEach(function(prop){
                                obj[prop] = mapping[prop];
                            });
                            obj[self.rightField.id] = rightIndex;
                            newMap.push(obj);
                        });
                    }
                }
            });

            this.setJoinMap(newMap);

            return newMap;
        }
    };

})(gryst.common);(function() {
    // constructor
    gryst.JoinMap = function(joinMap, $tables) {
        var self = this;
        //var keysRemoved = false;
        this.tables = $tables;
        this.map = joinMap;

        this.run = function() {
            var prop, obj, result = [];

            var props = this.map.length > 0 ? Object.getOwnPropertyNames(this.map[0]) : null;

            if (props) {
                if (props.length == 1) {
                    // if there's only one table represented in the map
                    // then simplify the structure of the returned array
                    prop = props[0];
                    this.map.forEach(function(mapping){
                        obj = self.tables[prop][mapping[prop]];
                        result.push(obj);
                    });
                }
                else {
                    this.map.forEach(function(mapping){
                        obj = {};
                        props.forEach(function(prop){
                            obj[prop] = self.tables[prop][mapping[prop]];
                        });
                        result.push(obj);
                    });

                }
            }
            return result;
        };
    };

    gryst.JoinMap.$inject = ['$tables'];

})();(function (common) {
    // the point of entry for extending gryst with new ops
    gryst.extend = function(name, op, inject) {
        if (inject) {
            op.$inject = inject;
        }
        gryst.Query.prototype[name] = function(arg) {
            var o = pf.createOp.call(this, op, arg);
            this.ops.push(o);
            return this;
        };
    };

    // constructor
    gryst.Query = function () {
        var self = this;
        this.tables = {};
        this.joinMap = [];
        this.ops = [];
        this.result = null;
        this.injector = new gryst.Injector(this);
        Object.defineProperty(this, "length", {
            get: function () {
                if (self.result === null) self.run();
                return self.result.length;
            }
        });
    };

    // private functions
    var pf = {
        createOp: function(op, args) {
            args = Array.isArray(args) ? args : [args];
            this.injector.inject(op, args);
            return new op(args[0],args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8],args[9]);
        },
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
        run: function() {
            var self = this;
            this.joinMap = [];
            this.result = null;

            // run all the ops in sequence
            this.ops.forEach(function(op) {
                self.result = op.run();
            });

            if (this.result === this.joinMap) {
                this.result = new gryst.JoinMap(this.joinMap, this.tables).run();
            }

            return this.result;
        }

    };

    gryst.Query.prototype = {
        from: function (table, id) {
            id = id || common.createTableID(this.tables);
            this.tables[id] = table;
            var op = pf.createOp.call(this, gryst.From, id);
            this.ops.push(op);
            return this;
        },
        join: function (table, id, leftField, rightField) {
            this.tables[id] = table;
            var op = pf.createOp.call(this, gryst.Join, [leftField, rightField]);
            this.ops.push(op);
            return this;
        },
        where: function (func) {
            var op = pf.createOp.call(this, gryst.Where, func);
            this.ops.push(op);
            return this;
        },
        orderBy: function (field, func) {
            var sort = pf.createOp.call(this, gryst.Sort, [field, false, func]);
            this.ops.push(sort);
            return this;
        },
        thenBy: function (field, func) {
            var sort = pf.createOp.call(this, gryst.Sort, [field, false, func]);
            pf.addChildSort.call(this, sort);
            return this;
        },
        orderByDescending: function (field, func) {
            var sort = pf.createOp.call(this, gryst.Sort, [field, true, func]);
            this.ops.push(sort);
            return this;
        },
        thenByDescending: function (field, func) {
            var sort = pf.createOp.call(this, gryst.Sort, [field, true, func]);
            pf.addChildSort.call(this, sort);
            return this;
        },
        group:function(value, key, id) {
            var op = pf.createOp.call(this, gryst.Group, [value, key, id]);
            this.ops.push(op);
            return this;
        },
        select: function (idOrFunc, id) {
            var op = pf.createOp.call(this, gryst.Select, [idOrFunc, id]);
            this.ops.push(op);
            return this;
        },
        distinct: function(func) {
            var op = pf.createOp.call(this, gryst.Distinct, func);
            this.ops.push(op);
            return this;
        },
        forEach: function(func) {
            var self = this;
            // run the runnable
            var result = this.run();
            result.forEach(function(row, index){
                func.call(self, row, index);
            });
        },
        run: function(callback){
            if (callback != undefined) {
                var self = this;
                setTimeout(function() {
                    callback(pf.run.call(self));
                }, 0);
            }
            else {
                return pf.run.call(this);
            }
        },
        get: function (index) {
            if (this.result === null) this.run();
            return this.result[index];
        }

    };
})(gryst.common);(function(common) {
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

})(gryst.common);gryst.extend("skip", function (count, $getJoinMap, $setJoinMap) {
    this.run = function () {
        gryst.log('skip: ' + count);
        var map = $getJoinMap().slice(count);
        $setJoinMap(map);
        return map;
    };
}, ['$getJoinMap', '$setJoinMap']);

gryst.extend("take", function (count, $getJoinMap, $setJoinMap) {
    this.run = function () {
        gryst.log('take: ' + count);
        var map = $getJoinMap().slice(0, count);
        $setJoinMap(map);
        return map;
    };
}, ['$getJoinMap', '$setJoinMap']);
(function(common) {

    // constructor
    gryst.Sort = function(field, desc, func, $tables, $getJoinMap, $setJoinMap) {
        this.field = field;
        this.desc = desc;
        this.func = func;
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.childSort = null;
        this.type = null;
        this.fieldRef = null;
        this.sort = null;
    };

    gryst.Sort.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    var pf = {
        getSortType:function(fieldRef) {
            // discover the type of sort to apply
            var i, t, key;
            if (fieldRef.table.length > 0) {
                // iterate through the table until we find a non-null value
                key = null;
                for (i = 0; i < fieldRef.table.length && common.isEmpty(key); i++) {
                    key = fieldRef.getArg(i);
                }
                if (!common.isEmpty(key)) {
                    t = common.getType(key);
                    gryst.log("Sort: key type: ");
                    gryst.log(t);
                    switch (t) {
                        case 'number':
                        case 'date':
                        case 'boolean':
                            return t;
                        default:
                            return 'string'
                    }
                }
            }
        },
        getSortFunction:function() {
            var type, self = this;

            gryst.log('Sort: resolving sort function');

            this.fieldRef = new gryst.FieldRef(this.field, this.tables);

            gryst.log('Sort: fieldRef:');
            gryst.log(this.fieldRef);

            if (this.func != undefined) {
                gryst.log('Sort: using supplied function');
                // use the user-supplied function
                return function(mapping1,mapping2){
                    var key1 = self.fieldRef.getArgForMapping(mapping1);
                    var key2 = self.fieldRef.getArgForMapping(mapping2);
                    var diff = self.func(key1, key2);
                    if (diff === 0 && self.childSort !== null) {
                        return self.childSort.sort(mapping1, mapping2);
                    }
                    return diff;
                };
            }

            // use one of the default sort functions
            type = pf.getSortType(this.fieldRef);

            // the sort functions look up the key for a given row index and sort by that key
            if (type === 'number' || type === 'date' || type == 'boolean') {
                gryst.log('Sort: sorting by number || date || boolean');
                if (this.desc === true) {
                    return function(mapping1,mapping2){
                        var key1 = self.fieldRef.getArgForMapping(mapping1);
                        var key2 = self.fieldRef.getArgForMapping(mapping2);
                        var diff = key2 - key1;
                        if (diff === 0 && self.childSort !== null) {
                            return self.childSort.sort(mapping1, mapping2);
                        }
                        return diff;
                    };
                }
                else {
                    return function(mapping1,mapping2){
                        var key1 = self.fieldRef.getArgForMapping(mapping1);
                        var key2 = self.fieldRef.getArgForMapping(mapping2);
                        var diff = key1 - key2;
                        if (diff === 0 && self.childSort !== null) {
                            return self.childSort.sort(mapping1, mapping2);
                        }
                        return diff;
                    };
                }
            }
            else {
                // sort by string
                gryst.log('Sort: sorting by string');
                if (this.desc === true) {
                    return function (mapping1, mapping2) {
                        var key1 = self.fieldRef.getArgForMapping(mapping1);
                        var key2 = self.fieldRef.getArgForMapping(mapping2);

                        if (key1 === null) {
                            if (key2 != null) {
                                return 1;
                            }
                        }
                        else if (key2 === null) {
                            // we already know key1 isn't null
                            return -1;
                        }
                        if (key1 > key2) {
                            return -1;
                        }
                        if (key1 < key2) {
                            return 1;
                        }

                        if (self.childSort !== null) {
                            return self.childSort.sort(mapping1, mapping2);
                        }

                        return 0;
                    };
                }
                else {
                    return function(mapping1,mapping2){
                        var key1 = self.fieldRef.getArgForMapping(mapping1);
                        var key2 = self.fieldRef.getArgForMapping(mapping2);

                        if (key1 === null) {
                            if (key2 != null) {
                                return -1;
                            }
                        }
                        else if (key2 === null) {
                            // we already know key1 isn't null
                            return 1;
                        }
                        if (key1 > key2) {
                            return 1;
                        }
                        if (key1 < key2) {
                            return -1;
                        }

                        if (self.childSort !== null) {
                            return self.childSort.sort(mapping1, mapping2);
                        }

                        return 0;
                    };
                }
            }
        }
    };

    gryst.Sort.prototype = {
        setChild: function(sort) {
            if (this.childSort === null) {
                this.childSort = sort;
            }
            else {
                this.childSort.setChild(sort);
            }
        },
        init:function() {
            this.sort = pf.getSortFunction.call(this);
            if (this.childSort !== null) {
                this.childSort.init();
            }
        },
        run: function() {
            // this function gets called only on the top sort in the chain

            var joinMap = this.getJoinMap();

            if (joinMap.length < 2) {
                gryst.log('Sort: empty join map');
                // there's nothing to sort
                return joinMap;
            }

            this.init();

            gryst.log('Sort: desc: ');
            gryst.log(this.desc);

            joinMap.sort(this.sort);

            return joinMap;
        }
    };

})(gryst.common);(function(common){

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