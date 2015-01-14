'use strict';

// global namespace
var gryst = gryst || {};

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
            total += a[field] == null ? 0 : a[field];
        });
        return total / count;
    }

};

(function() {

    // CustomEvent polyfill
    var customEvt = function (event, params) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    };

    customEvt.prototype = window.Event.prototype;
    window.CustomEvent = customEvt;

})();
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

    // constructor
    gryst.Group = function(group, key, groupID, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.tableID = groupID;
        if (typeof(group) == 'function') {
            this.groupFunc = group;
            this.groupFuncParams = gryst.common.getParamNames(group);
        }
        else {
            this.groupFuncParams = group;
        }
        if (typeof(key) == 'function') {
            this.keyFunc = key;
            this.keyFuncParams = gryst.common.getParamNames(key);
        }
        else {
            this.keyFuncParams = key;
        }
    };

    gryst.Group.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    gryst.Group.prototype = {
        run:function() {
            var self = this;
            var args, obj, key, newMap;
            var joinMap = this.getJoinMap();
            var keyFields = gryst.common.getFieldRefs(this.keyFuncParams, this.tables);
            var groupFields = gryst.common.getFieldRefs(this.groupFuncParams, this.tables);
            var grouping = new gryst.Grouping();
            // define the table in case we return early
            this.tables[this.tableID] = [];

            if (joinMap.length == 0) {
                return this.tables[this.tableID];
            }

            if (this.keyFunc) {
                joinMap.forEach(function(mapping){
                    args = gryst.common.getArguments(keyFields, mapping);
                    // the only reason we're using apply is to pass in an array of args
                    key = self.keyFunc.apply(self, args);
                    grouping.addKey(key, mapping);
                });
            }
            else {
                joinMap.forEach(function(mapping) {
                    args = gryst.common.getArguments(keyFields, mapping);
                    key = {};
                    keyFields.forEach(function(field, index){
                        if (field.field) {
                            key[field.field] = args[index];
                        }
                        else {
                            gryst.common.cloneObj(args[index], key);
                        }
                    });
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

    // constructor
    gryst.Grouping = function() {
        this.keys = [];
        this.coerced = [];
        this.map = new Map();
        this.type = null;

        // for testing
        //this.pf = Grouping_pf;
    };

    // private functions
    var Grouping_pf = {
        stringify:function(a) {
            var t, i, props, s = [];
            // this is a recursive function
            // so we have to detect the type on every iteration
            t = gryst.common.detectType(a);
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
                        s.push(Grouping_pf.stringify(a[i]));
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
                        s.push(Grouping_pf.stringify(a[props[i]]));
                    }
                    s.push('}');
                    break;
                default :
                    throw "Could not determine type: " + a;
            }
            return s.join('');
        },
        coerceKey:function(key, type) {
            switch(type)
            {
                case null:
                case 'number':
                case 'string':
                case 'boolean':
                    return key;
                case 'date':
                    // we're assuming that the keys in a column are all of the same type
                    // so converting a date to a number won't cause collisions with the number type
                    return key.getTime();
                case 'object':
                case 'array':
                    return Grouping_pf.stringify(key);
                case 'function':
                    throw "Grouping by functions is not supported";
                default :
                    throw "Could not determine key type";
            }
        },
        getArgs:function(fieldRefs, mappings) {
            var args, rows = [];
            if (fieldRefs.length == 1) {
                mappings.forEach(function(mapping){
                    args = gryst.common.getArguments(fieldRefs, mapping);
                    rows.push(args[0]);
                });
            }
            else {
                mappings.forEach(function(mapping){
                    args = gryst.common.getArguments(fieldRefs, mapping);
                    rows.push(args);
                });
            }
            return rows;
        }
    };

    gryst.Grouping.prototype = {
        addKey:function(key, mapping) {
            if (this.type == null) {
                this.type = gryst.common.detectType(key);
            }
            var k = Grouping_pf.coerceKey(key, this.type);
            if (!this.map.hasOwnProperty(k)) {
                this.map[k] = [];
                // save the original key and the coerced key to parallel arrays
                // so we only have to run the coerceKey function once
                this.keys.push(key);
                this.coerced.push(k);
            }
            this.map[k].push(mapping);
            return k;
        },
        getResult:function(groupFields, groupFunc) {
            var mappings, args, obj, arr;
            var i, coercedKey, result = [];

            if (groupFunc) {
                for (i = 0; i < this.keys.length; i++){
                    coercedKey = this.coerced[i];
                    mappings = this.map[coercedKey];
                    args = Grouping_pf.getArgs(groupFields, mappings);
                    if (groupFields.length == 1) {
                        arr = groupFunc.call(gryst.agg, args);
                    }
                    else {
                        arr = groupFunc.apply(gryst.agg, args);
                    }
                    result.push({
                        Key:this.keys[i],
                        Values:arr
                    });
                }
            }
            else {
                for (i = 0; i < this.keys.length; i++){
                    coercedKey = this.coerced[i];
                    mappings = this.map[coercedKey];
                    // getArgs returns an array of rows and/or field values
                    args = Grouping_pf.getArgs(groupFields, mappings);
                    // convert raw values into objects
                    arr = [];
                    args.forEach(function(arg){
                        obj = {};
                        groupFields.forEach(function(field, index){
                            if (field.field) {
                                // create a property in obj for the raw field value
                                obj[field.field] = arg[index];
                            }
                            else {
                                // this is an entire row
                                // copy the properties of the row into obj
                                gryst.common.cloneObj(arg[index], obj);
                            }
                        });
                        arr.push(obj);
                    });
                    result.push({
                        Key:this.keys[i],
                        Values:arr
                    });
                }
            }

            return result;
        }
    };

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

    // constructor
    gryst.Join = function(field1, field2, $getMap, $tables, $getJoinMap, $setJoinMap) {
        this.getMap = $getMap;
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        if (gryst.common.isEmpty(field1) || gryst.common.isEmpty(field2)) {
            throw "Join is missing field references.";
        }
        this.field1 = field1;
        this.field2 = field2;
    };

    gryst.Join.$inject = ['$getMap','$tables', '$getJoinMap', '$setJoinMap'];

    // private functions
    var Join_pf = {
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
                return joinMap;
            }

            // resolve table references during execution instead of initialization
            // because tables can be dynamically created with other operations
            this.fieldRef1 = gryst.common.getField(this.field1, this.tables);
            this.fieldRef2 = gryst.common.getField(this.field2, this.tables);

            if (joinMap.length == 0) {
                return;
            }

            Join_pf.setFieldReferences.call(this, joinMap);

            // construct a new join map
            var self = this;
            var leftIndex, obj, key, rightArr, newMap = [];
            var rightMap = this.getMap(this.rightField.id, this.rightField.field);

            joinMap.forEach(function(mapping){
                leftIndex = mapping[self.leftField.id];
                key = self.leftField.table[leftIndex][self.leftField.field];
                // since we're constructing a completely new map,
                // keys on the left side will be omitted if
                // they do not also exist on the right side
                if (rightMap.hasOwnProperty(key)) {
                    rightArr = rightMap[key];
                    if (!Array.isArray(rightArr)) {
                        rightArr = [rightArr];
                    }
                    rightArr.forEach(function(rightIndex){
                        // clone the mapping and add the right index to it
                        obj = gryst.common.cloneObj(mapping);
                        obj[self.rightField.id] = rightIndex;
                        newMap.push(obj);
                    });
                }
            });

            this.setJoinMap(newMap);

            //return new gryst.JoinMap(newMap, this.tables);

            return newMap;
        }
    };

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

    // constructor
    gryst.JSDB = function(){
        this.Tables = {};
    };

    gryst.JSDB.prototype = {

        loadData : function (urlArray) {
            // run ajax calls for all the urls in the constructor
            // store them in this.Tables using the the table name as the key

            if (urlArray) {
                // test for array
                if (Array.isArray(urlArray)) {
                    urlArray.forEach(function (url) {
                        $.get(url, function (result) {
                            self.Tables[result.TableName] = result;
                            self.onTableLoaded(result);
                        });
                    });
                }
                else {
                    // a single url has been passed
                    $.get(urlArray, function (result) {
                        self.Tables[result.TableName] = result;
                    });
                }
            }
        },

        objectify : function (table) {
            // convert all rows into objects
            var obj, colName;
            var ordinal = 0;
            var self = this;
            table.forEach(function (row, index) {
                obj = {};
                // create an object from the row using the column names as property names
                for (ordinal = 0; ordinal < table.Columns.length; ordinal++) {
                    colName = table.Columns[ordinal].ColumnName;
                    // convert empty spaces to null
                    obj[colName] = row[ordinal] === "" ? null : row[ordinal];
                }
                table[index] = obj;
            });
        },

        setTable : function (tableDefinition) {
            // if it has already been added, return it
            if (this.Tables[tableDefinition.TableName]) {
                throw "Table has already been added: " + tableDefinition.TableName;
            }
            var t = new gryst.Table(tableDefinition);
            this.objectify(t);
            this.Tables[t.TableName] = t;
            this.onTableLoaded(t);
            return t;
        },

        onTableLoaded : function (table) {
            // raise the tableLoaded event
            var event = new CustomEvent('tableLoaded', {
                "detail":
                { "Object": table }
            });
            document.dispatchEvent(event);
        },

        onDataLoaded : function () {
            // raise the dataLoaded event
            var event = new CustomEvent('dataLoaded', {
                "detail":
                { "Object": self }
            });
            document.dispatchEvent(event);
        }

    };

    // the point of entry for extending gryst with new ops
    gryst.extend = function(name, op, inject) {
        if (inject) {
            op.$inject = inject;
        }
        gryst.Query.prototype[name] = function(arg) {
            var o = Query_pf.createOp.call(this, op, arg);
            this.runnable.ops.push(o);
            return this;
        };
    };

    // constructor
    gryst.Query = function () {
        var self = this;
        this.runnable = new gryst.Runnable();
        this.injector = new gryst.Injector(this.runnable);

        Object.defineProperty(this, "length", {
            get: function () {
                if (self.runnable.result == null) self.runnable.run();
                return self.runnable.result.length;
            }
        });
    };

    // private functions
    var Query_pf = {
        createOp: function(op, args) {
            args = Array.isArray(args) ? args : [args];
            this.injector.inject(op, args);
            return new op(args[0],args[1],args[2],args[3],args[4],args[5],args[6],args[7],args[8],args[9]);
        }
    };

    gryst.Query.prototype = {
        from: function (table, id) {
            id = id || gryst.common.createTableID(this.runnable.tables);
            this.runnable.tables[id] = table;
            var op = Query_pf.createOp.call(this, gryst.From, id);
            this.runnable.ops.push(op);
            return this;
        },
        join: function (table, id, leftField, rightField) {
            this.runnable.tables[id] = table;
            var op = Query_pf.createOp.call(this, gryst.Join, [leftField, rightField]);
            this.runnable.ops.push(op);
            return this;
        },
        where: function (func) {
            var op = Query_pf.createOp.call(this, gryst.Where, func);
            this.runnable.ops.push(op);
            return this;
        },
        orderBy: function (field) {
            var sort = Query_pf.createOp.call(this, gryst.Sort, [field, false]);
            this.runnable.ops.push(sort);
            return this.thenBy(field);
        },
        thenBy: function (field) {
            var sort = Query_pf.createOp.call(this, gryst.Sort, [field, false]);
            this.runnable.addChildSort(sort);
            return this;
        },
        orderByDescending: function (field) {
            var sort = Query_pf.createOp.call(this, gryst.Sort, [field, true]);
            this.runnable.ops.push(sort);
            return this;
        },
        thenByDescending: function (field) {
            var sort = Query_pf.createOp.call(this, gryst.Sort, [field, true]);
            this.runnable.addChildSort(sort);
            return this;
        },
        group:function(value, key, id) {
            var op = Query_pf.createOp.call(this, gryst.Group, [value, key, id]);
            this.runnable.ops.push(op);
            return this;
        },
        select: function (idOrFunc, id) {
            var op = Query_pf.createOp.call(this, gryst.Select, [idOrFunc, id]);
            this.runnable.ops.push(op);
            return this;
        },
        forEach: function(func) {
            var self = this;
            // run the runnable
            var result = this.runnable.run();
            result.forEach(function(row, index){
                func.call(self, row, index);
            });
        },
        run: function(){
            return this.runnable.run();
        },
        get: function (index) {
            if (this.runnable.result == null) this.runnable.run();
            return this.runnable.result[index];
        }

    };
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
        getMap: function(id, field) {
            // create an object with the column values as property names
            // and the array index as the values
            var table = this.tables[id];
            var map;
            if (!table.hasOwnProperty("Maps")) {
                table.Maps = {};
            }
            if (table.Maps.hasOwnProperty(field)) {
                return table.Maps[field];
            }
            map = new Map();
            table.forEach(function(row, index){
                gryst.common.addToMap(map, row[field], index);
            });
            table.Maps[field] = map;
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

    // constructor
    gryst.Select = function(fieldOrFunc, tableID, $tables, $getJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.tableID = tableID;
        if (typeof(fieldOrFunc) == 'function') {
            this.func = fieldOrFunc;
            this.params = gryst.common.getParamNames(fieldOrFunc);
            if (this.params.length === 0) throw "Select function has no parameters.";
        }
        else {
            this.params = fieldOrFunc;
        }
    };

    gryst.Select.$inject = ['$tables', '$getJoinMap'];

    gryst.Select.prototype = {
        run:function() {
            var self = this;
            var val, args, obj, joinMap = this.getJoinMap();
            this.tableID = this.tableID || gryst.common.createTableID(this.tables);
            this.tables[this.tableID] = [];

            // getFieldRefs will fail if there's no data
            // so return early if joinMap is empty
            if (joinMap.length == 0) {
                return this.tables[this.tableID];
            }

            // this has to done here because tables can be created dynamically by other ops
            var fields = gryst.common.getFieldRefs(this.params, this.tables);

            if (this.func) {
                joinMap.forEach(function(mapping) {
                    args = gryst.common.getArguments(fields, mapping);
                    val = self.func.apply(self, args);
                    self.tables[self.tableID].push(val);
                });
            }
            else {
                joinMap.forEach(function(mapping) {
                    args = gryst.common.getArguments(fields, mapping);
                    obj = {};
                    fields.forEach(function(field, index){
                        if (field.field) {
                            obj[field.field] = args[index];
                        }
                        else {
                            gryst.common.cloneObj(args[index], obj);
                        }
                    });
                    self.tables[self.tableID].push(obj);
                });
            }

            return this.tables[this.tableID];
        }
    };

})();

gryst.extend("skip", function (count, $getJoinMap, $setJoinMap) {
    this.run = function () {
        var map = $getJoinMap().slice(count);
        $setJoinMap(map);
        return map;
    };
}, ['$getJoinMap', '$setJoinMap']);

gryst.extend("take", function (count, $getJoinMap, $setJoinMap) {
    this.run = function () {
        var map = $getJoinMap().slice(0, count);
        $setJoinMap(map);
        return map;
    };
}, ['$getJoinMap', '$setJoinMap']);
(function() {
    // constructor
    gryst.Sort = function(field, desc, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.field = field;
        this.desc = desc;
        this.childSort = null;
        this.type = null;
        this.isRoot = true;
    };

    gryst.Sort.$inject = ['$tables', '$getJoinMap', '$setJoinMap'];

    var Sort_pf = {
        getSortType:function(fieldRef) {
            // discover the type of sort to apply
            var i, t, key;
            if (fieldRef.table.length > 0) {
                // iterate through the table until we find a non-null value
                key = null;
                for (i = 0; i < fieldRef.table.length && gryst.common.isEmpty(key); i++) {
                    key = fieldRef.table[i][fieldRef.field];
                }
                if (!gryst.common.isEmpty(key)) {
                    t = gryst.common.detectType(key);
                    switch (t) {
                        case 'number':
                        case 'date':
                            return t;
                        default:
                            return 'string'
                    }
                }
            }
        },
        getSortFunction:function(fieldRef, type) {
            // the sort functions look up the key for a given row index and sort by that key
            if (type === 'number' || type === 'date') {
                if (this.desc === true) {
                    return function(mapping1,mapping2){
                        var key1 = Sort_pf.getKeyForMapping(fieldRef, mapping1);
                        var key2 = Sort_pf.getKeyForMapping(fieldRef, mapping2);
                        return key2 - key1;
                    };
                }
                else {
                    return function(mapping1,mapping2){
                        var key1 = Sort_pf.getKeyForMapping(fieldRef, mapping1);
                        var key2 = Sort_pf.getKeyForMapping(fieldRef, mapping2);
                        return key1 - key2;
                    };
                }
            }
            else {
                // sort by string
                if (this.desc === true) {
                    return function(mapping1,mapping2){
                        var key1 = Sort_pf.getKeyForMapping(fieldRef, mapping1);
                        var key2 = Sort_pf.getKeyForMapping(fieldRef, mapping2);
                        if (key1 > key2) {
                            return -1;
                        }
                        if (key1 < key2) {
                            return 1;
                        }
                        return 0;
                    };
                }
                else {
                    return function(mapping1,mapping2){
                        var key1 = Sort_pf.getKeyForMapping(fieldRef, mapping1);
                        var key2 = Sort_pf.getKeyForMapping(fieldRef, mapping2);
                        if (key1 > key2) {
                            return 1;
                        }
                        if (key1 < key2) {
                            return -1;
                        }
                        return 0;
                    };
                }
            }
        },
        getKeyForMapping:function(fieldRef, mapping) {
            var index = mapping[fieldRef.id];
            return fieldRef.table[index][fieldRef.field];
        },
        getSubMaps:function(joinMap, fieldRef) {
            var self = this;
            var subMaps = [];
            var key, keys = [];
            var keyTracker = new Map();

            // split up the join map by this sort's keys

            joinMap.forEach(function(mapping){
                key = Sort_pf.getKeyForMapping(fieldRef, mapping);
                // has the current key changed?
                if (!keyTracker.hasOwnProperty(key)) {
                    // I don't trust the Map to preserve the order
                    // so use an array of keys to ensure order
                    keys.push(key);
                    keyTracker[key] = [];
                }
                keyTracker[key].push(mapping);
            });

            keys.forEach(function(key){
                subMaps.push(keyTracker[key]);
            });

            return subMaps;
        }
    };

    gryst.Sort.prototype = {
        setChild: function(sort) {
            if (this.childSort == null) {
                sort.isRoot = false;
                this.childSort = sort;
            }
            else {
                this.childSort.setChild(sort);
            }
        },
        run: function(joinMap) {
            var self = this;
            var fieldRef = gryst.common.getField(this.field, this.tables);
            var type = Sort_pf.getSortType(fieldRef);

            if (type == null) {
                // the column is empty, no need to bother sorting
                // pass it on to the child sort if it exists
                if (this.childSort != null) {
                     return this.childSort.run(joinMap);
                }
                return joinMap;
            }

            var sortFunction = Sort_pf.getSortFunction(fieldRef, type);
            var subMaps, newJoinMap;

            // joinMap will be undefined on the first sort in the chain
            if (!joinMap) {
                joinMap = this.getJoinMap();
            }

            if (joinMap.length < 2) {
                // there's nothing to sort
                return joinMap;
            }

            joinMap.sort(sortFunction);

            // recurse
            if (this.childSort != null) {
                newJoinMap = [];
                subMaps = Sort_pf.getSubMaps.call(this, joinMap, fieldRef);
                subMaps.forEach(function(subMap){
                    if (subMap.length > 1) {
                        subMap = self.childSort.run(subMap);
                    }
                    newJoinMap = newJoinMap.concat(subMap);
                });
                joinMap = newJoinMap;
            }

            if (this.isRoot) {
                this.setJoinMap(joinMap);
            }

            return joinMap;
        }
    };

    // "subclass" of Array using the decorator pattern
    // http://jokeyrhy.me/blog/2013/05/13/1/js_inheritance_and_array_prototype.html

    gryst.Table = function(tableDefinition) {
        var arr = tableDefinition.Data;
        arr.Columns = tableDefinition.Columns;
        arr.TableName = tableDefinition.TableName;
        arr.Dictionaries = {};

        var midpoint = function(min, max) {
            return Math.round(min + (max - min) / 2);
        };

        // extend the array with some table-like functions

        arr.findByKey = function (key) {
            var min = 0, max = this.length - 1;
            var mid = 0;
            var keyOrdinal = this.getKeyOrdinal();
            var propName = this.Columns[keyOrdinal].ColumnName;

            // use a binary search algorithm to find the row
            while (max >= min) {
                // calculate the midpoint for roughly equal partition
                mid = midpoint(min, max);
                if (this[mid][propName] == key)
                // key found at index mid
                    return this[mid];
                // determine which subarray to search
                else if (this[mid][propName] < key)
                // change min index to search upper subarray
                    min = mid + 1;
                else
                // change max index to search lower subarray
                    max = mid - 1;
            }
            // key was not found
            return null;
        };

        arr.getKeyOrdinal = function () {
            return this.getColumn("IsKey", true).ordinal;
        };

        arr.getColumnOrdinal = function (columnName) {
            return this.getColumn("ColumnName", columnName).ordinal;
        };

        arr.getColumn = function (key, value) {
            var i, obj = {};
            for (i = 0; i < this.Columns.length; i++) {
                if (this.Columns[i][key] === value) {
                    obj.ordinal = i;
                    obj.column = this.Columns[i];
                    return obj;
                }
            }
            return null;
        };

        return arr;
    };

    // constructor
    gryst.Where = function(func, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.func = func;
        this.params = gryst.common.getParamNames(func);
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
            var fieldRefs = gryst.common.getFieldRefs(this.params, this.tables);

            joinMap.forEach(function(mapping, index){
                args = gryst.common.getArguments(fieldRefs, mapping);
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

})();
// eof fix