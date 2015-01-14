(function() {
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

})();