(function (common) {
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
})(gryst.common);