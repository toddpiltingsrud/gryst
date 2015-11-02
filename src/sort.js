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

})(gryst.common);