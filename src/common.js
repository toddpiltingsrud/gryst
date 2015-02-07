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
    deepEqual:function(obj1, obj2) {
        function countProps(obj) {
            var k, count = 0;
            for (k in obj) {
                if (obj.hasOwnProperty(k)) {
                    count++;
                }
            }
            return count;
        }

        function eq(v1, v2) {
            var k, r ;

            if (typeof(v1) !== typeof(v2)) {
                return false;
            }

            if (typeof(v1) === "function") {
                return v1.toString() === v2.toString();
            }

            if (v1 instanceof Object) {
                if (countProps(v1) !== countProps(v2)) {
                    return false;
                }
                r = true;
                for (k in v1) {
                    r = eq(v1[k], v2[k]);
                    if (!r) {
                        return false;
                    }
                }
                return true;
            }

            return v1 === v2;

        }

        return eq(obj1, obj2);
    },
    getFieldRefs:function(fields, tables) {
        var a = [];
        var f = Array.isArray(fields) ? fields : fields.split(',');
        f.forEach(function(field){
            if (field[0] != '$') {
                a.push(new gryst.FieldRef(field, tables));
            }
        });
        return a;
    },
    getArguments: function(fieldRefs, mapping) {
        // return the args in the order they appear in fieldRefs
        var args = [];
        fieldRefs.forEach(function(fieldRef){
            args.push(fieldRef.getArgForMapping(mapping));
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
    getType:function(a) {
        if (a === null) {
            return null;
        }
        var t = typeof(a);
        if (t === 'number' || t === 'string' || t === 'boolean' || t === 'function') {
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
