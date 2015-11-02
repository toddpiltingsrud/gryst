(function() {

    // "subclass" of Array using the decorator pattern
    // http://jokeyrhy.me/blog/2013/05/13/1/js_inheritance_and_array_prototype.html

    gryst.Table = function(tableDefinition) {
        var arr = tableDefinition.Data;
        arr.Columns = tableDefinition.Columns;
        arr.TableName = tableDefinition.TableName;
        arr.Dictionaries = {};

        var midpoint = function(min, max) {
            return Math.round(min + (max - min) / 2);
        };

        // extend the array with some table-like functions

        arr.findByKey = function (key) {
            var min = 0, max = this.length - 1;
            var mid = 0;
            var keyOrdinal = this.getKeyOrdinal();
            var propName = this.Columns[keyOrdinal].ColumnName;

            // use a binary search algorithm to find the row
            while (max >= min) {
                // calculate the midpoint for roughly equal partition
                mid = midpoint(min, max);
                if (this[mid][propName] == key)
                // key found at index mid
                    return this[mid];
                // determine which subarray to search
                else if (this[mid][propName] < key)
                // change min index to search upper subarray
                    min = mid + 1;
                else
                // change max index to search lower subarray
                    max = mid - 1;
            }
            // key was not found
            return null;
        };

        arr.getKeyOrdinal = function () {
            return this.getColumn("IsKey", true).ordinal;
        };

        arr.getColumnOrdinal = function (columnName) {
            return this.getColumn("ColumnName", columnName).ordinal;
        };

        arr.getColumn = function (key, value) {
            var i, obj = {};
            for (i = 0; i < this.Columns.length; i++) {
                if (this.Columns[i][key] === value) {
                    obj.ordinal = i;
                    obj.column = this.Columns[i];
                    return obj;
                }
            }
            return null;
        };

        return arr;
    };

})();