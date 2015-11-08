// configure the table tests
if (!window.testconfig) {
    window.testconfig = {
        db: new gryst.JSDB(),
        table: "Conjugation",
        indexColumn: "ConjugationID"
    };

    window.testconfig.db.setTable(Verb);
    window.testconfig.db.setTable(Conjugation);
    window.testconfig.db.setTable(Tense);
    window.testconfig.db.setTable(Mood);
    gryst.logging = true;
}

var db = window.testconfig.db;

describe('Query: createIndex', function () {

    it('should create a functioning index', function () {

        var qry = new gryst.Query().from(db.Tables.Conjugation, "c");
        var fieldRef = new gryst.FieldRef("ConjugationID", db.Tables);

        var index = fieldRef.getMap();

        var rowIndex = index["12000"];

        var row = db.Tables.Conjugation[rowIndex];

        expect(row.ConjugationID).toEqual(12000);
    });

    it('should create a functioning index from a Date column', function () {

        var i;

        var data = [];

        for (i = 0; i < 100; i++) {
            data.push(
                {Date:new Date(i * 100000), Title:"row " + i}
            );
        }

        var qry = gryst.from(data, "d");

        var fieldRef = new gryst.FieldRef("d.Date", qry.tables);

        var index = fieldRef.getMap();

        var rowIndex, row;

        for (i = 0; i < 5 && i < data.length; i++) {
            rowIndex = index[new Date(i * 100000)];
            row = data[rowIndex];
            expect(row.Title).toEqual("row " + i);
        }

    });

});

describe('Query', function () {

    it('should build a Runnable with some tables in it', function () {

        var qry = new gryst.Query();

        qry
          .from(db.Tables.Conjugation, "c")
          .join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID")
          .where(function (c) {
              return c.ConjugationID == 12000 || c.Yo == "hablo";
          })
          .select(function (c) {
          });

        var result = qry.tables.c;
        expect(result.length).toEqual(11466);

        result = qry.tables.v;
        expect(result.length).toEqual(637);
    });

});

describe('Query.from', function () {

    it('should add a table to the Runnable and populate the joinMap', function () {

        var qry = new gryst.Query();

        qry
            .from(db.Tables.Verb, "v");

        qry.run();

        expect(qry.tables.v).toBeDefined();

        expect(qry.joinMap.length).toEqual(db.Tables.Verb.length);

        //for (i = 0; i < 4; i++) {
        //    console.log(qry.runnable.joinMap[i]);
        //}

    });

    it('should create a cross join', function () {

        var qry = new gryst.Query();

        qry
            .from(db.Tables.Mood, "m")
            .from(db.Tables.Tense, "t");

        expect(qry.length).toEqual(db.Tables.Mood.length * db.Tables.Tense.length);

        //for (i = 0; i < 4; i++) {
        //    console.log(qry.runnable.result[i]);
        //}

    });

});

describe('join', function () {

    it('should join tables', function () {

        var qry = new gryst.Query();

        qry
            .from(db.Tables.Verb, "v")
            .join(db.Tables.Conjugation, "c", "v.VerbID", "c.VerbID")
            .join(db.Tables.Mood, "m", "m.MoodID", "c.MoodID");

        qry.run();

        var joinMap = qry.joinMap;

        expect(qry.ops[1].leftField.id).toEqual('v');

        expect(qry.ops[1].rightField.id).toEqual('c');

        expect(qry.ops[1].leftField.field).toEqual('VerbID');

        expect(qry.ops[1].rightField.field).toEqual('VerbID');

        expect(joinMap.length).toEqual(db.Tables.Conjugation.length);

        expect(joinMap[0].c).toBeDefined();

        expect(joinMap[0].v).toBeDefined();

        expect(joinMap[0].m).toBeDefined();

        //for (var i = 0; i < 40; i++) {
        //    console.log(joinMap[i]);
        //}

    });

});

describe('common.getFieldRefs', function () {

    it('should find tables and/or fields within those tables', function () {

        var s = "Conjugation , Verb.Infinitive ";

        var fieldRefs = gryst.common.getFieldRefs(s, db.Tables);

        expect(fieldRefs.length).toEqual(2);

        expect(fieldRefs[0].id).toEqual("Conjugation");

        expect(fieldRefs[0].field).toBeNull();

        expect(fieldRefs[1].id).toEqual("Verb");

        expect(fieldRefs[1].field).toEqual("Infinitive");

    });

});

describe('Where', function () {

    it('should filter a table', function () {

        var qry = gryst
            .from(db.Tables.Verb, "v")
            .join(db.Tables.Conjugation, "c", "v.VerbID", "c.VerbID")
            .where(function (ConjugationID, Yo) {
                return ConjugationID == 12000 || Yo == "hablo";
            });

        // run the where clause
        qry.run();

        expect(qry.joinMap.length).toEqual(2);

    });

    it('should resolve a field reference when no table ID was explicitly specified', function () {

        var qry = gryst
            .from(db.Tables.Conjugation)
            .where(function (ConjugationID, Yo) {
                return ConjugationID == 12000 || Yo == "hablo" || ConjugationID == 12001;
            });

        // run the where clause
        qry.run();

        expect(qry.joinMap.length).toEqual(3);

        qry = gryst
            .from(db.Tables.Conjugation)
            .where(function (row) {
                return row.ConjugationID == 12000 || row.Yo == "hablo" || row.ConjugationID == 12001;
            });

        // run the where clause
        qry.run();

        expect(qry.joinMap.length).toEqual(3);

    });


});

describe('Select', function () {

    it('should compose a result', function () {

        var qry = gryst
            .from(db.Tables.Verb, "v")
            .join(db.Tables.Conjugation, "c", "v.VerbID", "c.VerbID")
            .join(db.Tables.Mood, "m", "m.MoodID", "c.MoodID")
            .select(function(v,c,m){
                return {
                    Infinitive: v.Infinitive,
                    Yo: c.Yo,
                    Mood: m.Spanish
                };
            });

        // run the query
        var result = qry.run();

        //for (var i = 0; i < 20 && i < result.length; i++) {
        //    console.log(result[i]);
        //}

        expect(result[0].Infinitive).toBeDefined();

        qry = gryst
            .from(db.Tables.Verb, "v")
            .join(db.Tables.Conjugation, "c", "v.VerbID", "c.VerbID")
            .join(db.Tables.Mood, "m", "m.MoodID", "c.MoodID")
            .select("v.Infinitive,c.Yo,m");

        result = qry.run();

        //for (var i = 0; i < 20 && i < result.length; i++) {
        //    console.log(result[i]);
        //}

        //expect(result[0].length).toEqual(3);

    });

});

describe('Sort class', function () {

        it('should stand on its head', function () {

            var qry = new gryst.Query()
                .from(db.Tables.Conjugation, "c")
                .join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID")
                .orderBy("v.Infinitive")
                .thenByDescending("c.Yo")
                .select(function (c, v) {
                    return {
                        Infinitive: v.Infinitive,
                        Yo: c.Yo
                    };
                });

            var result = qry.run();

            for (var i = 0; i < 40 && i < result.length; i++) {
                if (result[i].Infinitive == result[i + 1].Infinitive
                    && (result[i].Yo != null && result[i + 1].Yo != null)) {
                    expect(result[i].Yo).toBeGreaterThan(result[i + 1].Yo);
                }

                //console.log(result[i]);
            }

        });

        it('should sort simple arrays', function () {

            var qry = gryst.
                from(stops, "s").
                orderBy("s[3]").
                select("s[3]");

            var result = qry.run();

            for (var i = 0; i < 20; i++) {
                if (result[i] != result[i + 1]) {
                    expect(result[i]).toBeLessThan(result[i + 1]);
                }
            }

        });

        it('should sort with user-defined function', function () {

            var pos = {lat: 44.9833, lng: -93.2667}; // Minneapolis

            var qry = gryst.
                from(stops, "s").
                orderBy("s", function (s1, s2) {
                    // sort by how far away it is from pos
                    var diff1 = Math.abs(s1[2] - pos.lat) + Math.abs(s1[3] - pos.lng);
                    var diff2 = Math.abs(s2[2] - pos.lat) + Math.abs(s2[3] - pos.lng);
                    return diff1 - diff2;
                }).
                take(20);

            var result = qry.run();

            for (var i = 0; i < 20 && i < result.length - 1; i++) {
                var diff1 = Math.abs(result[i][2] - pos.lat) + Math.abs(result[i][3] - pos.lng);
                var diff2 = Math.abs(result[i + 1][2] - pos.lat) + Math.abs(result[i + 1][3] - pos.lng);
                if (diff1 != diff2) {
                    expect(diff1).toBeLessThan(diff2);
                }
            }

        });

});

describe('Skip and Take', function () {

    it('should return a subset of the result', function () {

        var i;

        var qry = gryst.
            from(db.Tables.Conjugation, "c").
            where(function(c){
                return c.Yo != null;
            }).
            join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID").
            orderByDescending("v.Infinitive").
            thenBy("c.Yo").
            skip(10).
            take(10).
            select(function(c, v) {
                return {
                    ID: c.ConjugationID,
                    Infinitive: v.Infinitive,
                    Yo: c.Yo
                };
            });

        var qry2 = new gryst.Query();

        qry2
            .from(db.Tables.Conjugation, "c")
            .where(function(c){
                return c.Yo != null;
            })
            .join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID")
            .orderByDescending("v.Infinitive")
            .thenBy("c.Yo")
            .select(function(c, v) {
                return {
                    ID: c.ConjugationID,
                    Infinitive: v.Infinitive,
                    Yo: c.Yo
                };
            });

        var result1 = qry.run();

        var result2 = qry2.run();

        expect(result1.length).toEqual(10);

        for (i = 0; i < 20 && i < result1.length; i++) {
            expect(result1[i]).toEqual(result2[i + 10]);
        }

    });

});

describe('grouping.stringify', function(){

    it ('should turn objects and arrays into strings', function(){

        grouping = new gryst.Grouping();

        if (grouping.pf) {
            var d = new Date(50);

            var obj1 = {Name:'Todd', Phone:'9634'};

            var arr1 = ['Todd', '9634', d, obj1, 1, null, false];

            expect(grouping.pf.stringify(d)).toEqual('Date(50)');

            expect(grouping.pf.stringify(obj1)).toEqual('{"Name":"Todd","Phone":"9634"}');

            expect(grouping.pf.stringify(arr1))
                .toEqual('["Todd","9634",Date(50),{"Name":"Todd","Phone":"9634"},1,null,false]');
        }
    });

});

describe('Grouping', function () {

    it('should add dates, objects and arrays', function () {

        // test date

        grouping = new gryst.Grouping();

        var d = new Date();

        var s = "This is a test with a date";

        var k = grouping.addKey(d, s);

        //expect(grouping.type).toEqual('date');

        expect(grouping.keys[0]).toEqual(d);

        //expect(grouping.map[k][0]).toEqual(s);

        // test object

        var obj1 = {Name:'Todd', Phone:'9634'};

        var grouping = new gryst.Grouping();

        grouping.addKey(obj1, "This is a test with an object");

        //expect(grouping.type).toEqual('object');

        expect(grouping.keys[0]).toEqual(obj1);

        expect(grouping.map[grouping.coerced[0]]).toEqual(["This is a test with an object"]);



        // test array

        var arr1 = ['Todd', '9634'];
        var arr2 = ['Kit', '1011'];

        grouping = new gryst.Grouping();

        grouping.addKey(arr1, "Array 1");

        grouping.addKey(arr2, "Array 2");

        expect(grouping.keys[0]).toEqual(arr1);

        expect(grouping.keys[1]).toEqual(arr2);

        expect(grouping.map[grouping.coerced[0]]).toEqual(["Array 1"]);

        expect(grouping.map[grouping.coerced[1]]).toEqual(["Array 2"]);

    });

    it('should create groupings with arbitrary keys', function () {

        var i;

        // group on a string

        var qry = gryst.
            from(db.Tables.Conjugation, "c").
            group(function(c){
                return gryst.from(c).select("Yo").run();
            }, "c.TenseID", "i").
            select("i");

        var result = qry.run();

        for (i = 0; i < 15 && i < result.length; i++) {
            expect(result[i].key).toBeDefined();
            expect(result[i].values).toBeDefined();
            //console.log(result[i].values);
        }
    });

    it('should create groupings with arbitrary keys', function () {

        var i;

        // group on a string

        var qry =
        gryst.from(db.Tables.Conjugation, "c").
            join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID").
            where(function(c){
                return c.Yo != null;
            }).
            group("c.Yo", "v.Infinitive", "i").
            where(function(i){
                return i.key[0] == 'b';
            }).
            select("i");

        var result = qry.run();

        for (i = 0; i < 5 && i < result.length; i++) {
            expect(result[i].key).toBeDefined();
            expect(result[i].values).toBeDefined();
        }
    });

    it('should group on an object', function () {

        var i;

        var qry = new gryst.Query();

        qry
            .from(db.Tables.Conjugation, "c")
            .join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID")
            .where(function(c){
                return c.Yo != null;
            })
            .group(
                // what to group
                "Yo,Tu,Nosotros",
                // the key to group by
                "VerbID,Infinitive",
                // the table alias to be created
                "i"
            )
            .where(function(i){
                return i.key.Infinitive[0] == 'b';
            })
            .select("i");

        var result = qry.run();

        for (i = 0; i < 5 && i < result.length; i++) {
            expect(typeof result[i].key).toEqual('object');
            expect(result[i].key.VerbID).toBeDefined();
            expect(result[i].values[0].Nosotros).toBeDefined();
        }

    });

    it('should resolve table references', function () {

        var i;

        var qry = new gryst.Query();

        qry
            .from(db.Tables.Conjugation, "c")
            .join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID")
            .where(function(c, v){
                return c.Yo != null && v.Infinitive != null;
            })
            .group(
                // what to group
                "c",
                // the key to group by
                "VerbID,Infinitive",
                // the table alias to be created
                "i"
            )
            .where(function(i){
                return i.key.Infinitive[0] == 'b';
            })
            .select("i");

        var result = qry.run();

        for (i = 0; i < 5 && i < result.length; i++) {
            //console.log(result[i].key);
        }

    });

    it('should group on Dates', function () {

        // group on a Date

        var i;

        var qry = new gryst.Query();

        var time = new Date().getTime();

        qry
            .from(db.Tables.Conjugation, "c")
            .where(function(c){
                return c.Yo != null;
            })
            .group(
                function(c) {
                    // the values to group
                    return c;
                },
                function() {
                    // the key to group by
                    time += 10000000;
                    return new Date(time);
                },
                "i"
            );
            //.select(function(i){return i;});

        var result = qry.run();

        for (i = 0; i < 5 && i < result.length; i++) {
            expect(result[i].key instanceof Date).toEqual(true);
            expect(result[i].values[0].ConjugationID).toBeDefined();
        }

    });

});

describe('max and min', function () {

    it('should find the max and min values for a field reference', function () {

        var i, qry = gryst.
            from(db.Tables.Conjugation).
            group(
                function(ConjugationID) {
                    return {
                        Max:this.max(ConjugationID),
                        Min:this.min(ConjugationID)
                    };
                },
                "MoodID",
                "g"
            );

        for (i = 0; i < 5 && i < qry.length; i++) {
            expect(qry.get(i).values.Max).toBeDefined();
            expect(qry.get(i).values.Min).toBeDefined();
            //console.log(result[i]);
        }

        var length = qry.length;

        expect(length).toEqual(db.Tables.Mood.length);

        qry = gryst.
            from(db.Tables.Conjugation).
            group(
                function(a) {
                    return {
                        Max:this.max(a, "ConjugationID"),
                        Min:this.min(a, "ConjugationID")
                    };
                },
                "MoodID",
                "g"
           );

        var result = qry.run();

        for (i = 0; i < 5 && i < result.length; i++) {
            expect(result[i].values.Max).toBeDefined();
            expect(result[i].values.Min).toBeDefined();
            //console.log(result[i]);
        }

    });

});

describe('Operation chaining', function(){

    it ('should be able to alternately append operations and re-execute ad nauseum', function(){

        function checkResult(qry, id) {
            var result = qry.run();
            //console.log("checking " + id);
            for (i = 0; i < 1 && i < qry.length; i++) {
                expect(result[i][id]).toBeDefined();
                //console.log(result[i]);
            }
            return result;
        }

        var qry = gryst.
            from(db.Tables.Tense, "t");

        checkResult(qry, "TenseID");

        qry.join(db.Tables.Conjugation, "c", "t.TenseID", "c.TenseID");

        checkResult(qry, "c");

        qry.where(function(Yo) {
            return Yo != null;
        });

        checkResult(qry, "c");

        qry.group("c", "TenseID", "tense");

        checkResult(qry, "key");

        qry.orderBy("key");

        checkResult(qry, "key");

        qry.select("values,key");

        checkResult(qry, "values");

    });

});

describe("Distinct", function() {

    it("should find unique values", function(){
        var qry = gryst.
            from(db.Tables.Conjugation, "c").
            select("c.VerbID").
            distinct();

        var result = qry.run();

        for (var i = 0; i < result.length - 1 && i < 20; i++) {
            expect(result[i]).not.toEqual(result[i + 1]);
        }
    });

    it("should find unique objects", function(){
        var qry = gryst.
            from(db.Tables.Conjugation, "c").
            select("c").
            distinct();

        var result = qry.run();

        for (var i = 0; i < result.length - 1 && i < 20; i++) {
            expect(result[i]).not.toEqual(result[i + 1]);
        }
    });

    it("should find unique arrays", function(){
        var qry = gryst.
            from(db.Tables.Conjugation, "c").
            select(function(c){
                return [c.VerbID];
            }).
            distinct();

        var result = qry.run();

        for (var i = 0; i < result.length - 1 && i < 20; i++) {
            expect(result[i]).not.toEqual(result[i + 1]);
        }
    });

    it("should use a function to determine uniqueness", function(){
        var qry = gryst.
            from(db.Tables.Conjugation, "c").
            distinct(function(c1, c2){
                return c1.VerbID == c2.VerbID;
            });

        var result = qry.run();

        for (var i = 0; i < result.length - 1 && i < 20; i++) {
            expect(result[i]).not.toEqual(result[i + 1]);
        }

        expect(result.length).toEqual(db.Tables.Verb.length);
    });

});

describe("deepEqual", function() {
    
    var eq = gryst.common.deepEqual;

    it("should compare two objects recursively", function(){

        expect(eq(null, null)).toEqual(true);
        expect(eq(null, undefined)).toEqual(false);

        expect(eq("hi", "hi")).toEqual(true);
        expect(eq(5, 5)).toEqual(true);
        expect(eq(5, 10)).toEqual(false);

        expect(eq([], [])).toEqual(true);
        expect(eq([1, 2], [1, 2])).toEqual(true);
        expect(eq([1, 2], [2, 1])).toEqual(false);
        expect(eq([1, 2], [1, 2, 3])).toEqual(false);

        expect(eq({}, {})).toEqual(true);
        expect(eq({ a: 1, b: 2 }, { a: 1, b: 2 })).toEqual(true);
        expect(eq({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual(true);
        expect(eq({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual(false);

        expect(eq({ 1: { name: "mhc", age: 28 }, 2: { name: "arb", age: 26 } }, { 1: { name: "mhc", age: 28 }, 2: { name: "arb", age: 26 } })).toEqual(true);
        expect(eq({ 1: { name: "mhc", age: 28 }, 2: { name: "arb", age: 26 } }, { 1: { name: "mhc", age: 28 }, 2: { name: "arb", age: 27 } })).toEqual(false);

        expect(eq(function (x) { return x; }, function (x) { return x; })).toEqual(true);
        expect(eq(function (x) { return x; }, function (y) { return y + 2; })).toEqual(false);
    });

});

describe('Query', function () {

    it('should execute async', function (done) {

        var qry = new gryst.Query().from(db.Tables.Conjugation, "c");

        var i = 0;

        qry.run(function(result) {
            i++;
            done();
            console.log(i);
            console.log(result.length);
        });

        expect(i).toEqual(0);

    });

});
