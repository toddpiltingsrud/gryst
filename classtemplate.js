'use strict';

// global namespace
var tp = tp || {};

(function() {
    if ('ClassName' in tp) {
        return;
    }

    // constructor
    tp.ClassName = function() {

    };

    // private functions
    var ClassName_pf = {

    };

    var publicFunctions = {

    };

    //// inheritance
    //
    //tp.ClassName.prototype = new ParentClass();
    //tp.ClassName.prototype.constructor = tp.ClassName;
    //tp.ClassName.prototype.base = ParentClass.prototype;
    //for (var name in publicFunctions) {
    //    if (publicFunctions.hasOwnProperty(name)) {
    //        tp.ClassName.prototype[name] = publicFunctions[name];
    //    }
    //}

    tp.ClassName.prototype = publicFunctions;

})();
