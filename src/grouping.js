(function(common) {
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

})(gryst.common);