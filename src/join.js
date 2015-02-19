(function(common) {
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
                return joinMap;
            }

            // resolve table references during execution instead of initialization
            // because tables can be dynamically created with other operations
            this.fieldRef1 = new gryst.FieldRef(this.field1, this.tables);
            this.fieldRef2 = new gryst.FieldRef(this.field2, this.tables);

            // determine left side & right side
            pf.setFieldReferences.call(this, joinMap);

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

})(gryst.common);