(function() {
    // constructor
    gryst.JSDB = function(){
        this.Tables = {};
    };

    gryst.JSDB.prototype = {

        loadData : function (urlArray) {
            // run ajax calls for all the urls in the constructor
            // store them in this.Tables using the the table name as the key

            if (urlArray) {
                // test for array
                if (Array.isArray(urlArray)) {
                    urlArray.forEach(function (url) {
                        $.get(url, function (result) {
                            self.Tables[result.TableName] = result;
                            self.onTableLoaded(result);
                        });
                    });
                }
                else {
                    // a single url has been passed
                    $.get(urlArray, function (result) {
                        self.Tables[result.TableName] = result;
                    });
                }
            }
        },

        objectify : function (table) {
            // convert all rows into objects
            var obj, colName;
            var ordinal = 0;
            var self = this;
            table.forEach(function (row, index) {
                obj = {};
                // create an object from the row using the column names as property names
                for (ordinal = 0; ordinal < table.Columns.length; ordinal++) {
                    colName = table.Columns[ordinal].ColumnName;
                    // convert empty spaces to null
                    obj[colName] = row[ordinal] === "" ? null : row[ordinal];
                }
                table[index] = obj;
            });
        },

        setTable : function (tableDefinition) {
            // if it has already been added, return it
            if (this.Tables[tableDefinition.TableName]) {
                throw "Table has already been added: " + tableDefinition.TableName;
            }
            var t = new gryst.Table(tableDefinition);
            this.objectify(t);
            this.Tables[t.TableName] = t;
            this.onTableLoaded(t);
            return t;
        },

        onTableLoaded : function (table) {
            // raise the tableLoaded event
            var event = new CustomEvent('tableLoaded', {
                "detail":
                { "Object": table }
            });
            document.dispatchEvent(event);
        },

        onDataLoaded : function () {
            // raise the dataLoaded event
            var event = new CustomEvent('dataLoaded', {
                "detail":
                { "Object": self }
            });
            document.dispatchEvent(event);
        }

    };

})();