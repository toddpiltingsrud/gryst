(function() {
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

            // determine left side & right side
            Join_pf.setFieldReferences.call(this, joinMap);

            // construct a new join map
            var self = this;
            var leftIndex, obj, key, rightArr, newMap = [];
            var rightMap = this.getMap(this.rightField);

            joinMap.forEach(function(mapping){
                //leftIndex = mapping[self.leftField.id];
                //key = self.leftField.table[leftIndex][self.leftField.field];

                key = gryst.common.getArgForMapping(self.leftField, mapping);

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

})();