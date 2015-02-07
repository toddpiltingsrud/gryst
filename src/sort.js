(function(common) {

    // constructor
    gryst.Sort = function(field, desc, func, $tables, $getJoinMap, $setJoinMap) {
        this.tables = $tables;
        this.getJoinMap = $getJoinMap;
        this.setJoinMap = $setJoinMap;
        this.field = field;
        this.desc = desc;
        this.childSort = null;
        this.type = null;
        this.func = func;
        this.fieldRef = null;
        this.sortFunction = null;
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
        getSortFunction:function() {
            var type, self = this;

            this.fieldRef = new gryst.FieldRef(this.field, this.tables);

            if (this.func != undefined) {
                // use the user-supplied function
                return function(mapping1,mapping2){
                    var key1 = self.fieldRef.getArgForMapping(mapping1);
                    var key2 = self.fieldRef.getArgForMapping(mapping2);
                    var diff = self.func(key1, key2);
                    if (diff == 0 && self.childSort != null) {
                        return self.childSort.sort(mapping1, mapping2);
                    }
                    return diff;
                };
            }

            // use one of the default sort functions
            type = pf.getSortType(this.fieldRef);

            // the sort functions look up the key for a given row index and sort by that key
            if (type === 'number' || type === 'date') {
                if (this.desc === true) {
                    return function(mapping1,mapping2){
                        var key1 = self.fieldRef.getArgForMapping(mapping1);
                        var key2 = self.fieldRef.getArgForMapping(mapping2);
                        var diff;

                        if (key1 === null) {
                            if (key2 != null) {
                                return 1;
                            }
                        }
                        else if (key2 === null) {
                            // we already know key1 isn't null
                            return -1;
                        }

                        diff = key2 - key1;

                        if (diff == 0 && self.childSort != null) {
                            return self.childSort.sort(mapping1, mapping2);
                        }
                        return diff;
                    };
                }
                else {
                    return function(mapping1,mapping2){
                        var key1 = self.fieldRef.getArgForMapping(mapping1);
                        var key2 = self.fieldRef.getArgForMapping(mapping2);
                        var diff;

                        if (key1 === null) {
                            if (key2 != null) {
                                return -1;
                            }
                        }
                        else if (key2 === null) {
                            // we already know key1 isn't null
                            return 1;
                        }

                        diff = key1 - key2;

                        if (diff == 0 && self.childSort != null) {
                            return self.childSort.sort(mapping1, mapping2);
                        }
                        return diff;
                    };
                }
            }
            else {
                // sort by string
                if (this.desc === true) {
                    return function(mapping1,mapping2){
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
                        else {
                            if (key1 > key2) {
                                return -1;
                            }
                            if (key1 < key2) {
                                return 1;
                            }
                        }

                        if (self.childSort != null) {
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
                        else {
                            if (key1 > key2) {
                                return 1;
                            }
                            if (key1 < key2) {
                                return -1;
                            }
                        }

                        if (self.childSort != null) {
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
                sort.isRoot = false;
                this.childSort = sort;
            }
            else {
                this.childSort.setChild(sort);
            }
        },
        sort:function(mapping1, mapping2) {
            var diff;
            if (this.sortFunction === null) {
                this.sortFunction = pf.getSortFunction.call(this);
            }
            diff = this.sortFunction(mapping1, mapping2);
            if (diff == 0 && this.childSort != null) {
                return this.childSort.sort(mapping1, mapping2);
            }
            return diff;
        },
        run: function(joinMap) {
            // joinMap will be undefined on the first sort in the chain
            if (!joinMap) {
                joinMap = this.getJoinMap();
            }

            if (joinMap.length < 2) {
                // there's nothing to sort
                return joinMap;
            }

            this.sortFunction = pf.getSortFunction.call(this);

            joinMap.sort(this.sortFunction);

            return joinMap;
        }
    };

})(gryst.common);