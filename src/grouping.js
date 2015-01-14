(function() {
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

})();