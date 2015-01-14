(function () {
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
})();