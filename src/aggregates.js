'use strict';

// global namespace
var gryst = gryst || {};

gryst.agg = {

    max : function(arr, field) {
        var r = arr;
        if (field) {
            r = [];
            arr.forEach(function(a, index) {
                r[index] = arr[index][field];
            });
        }
        return Math.max.apply(this, r);
    },
    min: function(arr, field) {
        var r = arr;
        if (field) {
            r = [];
            arr.forEach(function(a, index) {
                r[index] = arr[index][field];
            });
        }
        return Math.min.apply(this, r);
    },
    avg: function(arr, field) {
        var count = 0, total = 0;
        arr.forEach(function(a){
            count++;
            total += a[field] === null ? 0 : a[field];
        });
        return total / count;
    }

};

