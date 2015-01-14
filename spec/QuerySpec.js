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
}

var db = window.testconfig.db;

describe('Query: createIndex', function () {

    it('should create a functioning index', function () {

        var qry = new gryst.Query().from(db.Tables.Conjugation, "c");

        var index = qry.runnable.getMap("c", "ConjugationID");

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

        var index = qry.runnable.getMap("d", "Date");

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

        var result = qry.runnable.tables.c;
        expect(result.length).toEqual(11466);

        result = qry.runnable.tables.v;
        expect(result.length).toEqual(637);
    });

});

describe('Query.from', function () {

    it('should add a table to the Runnable and populate the joinMap', function () {

        var qry = new gryst.Query();

        qry
            .from(db.Tables.Verb, "v");

        qry.run();

        expect(qry.runnable.tables.v).toBeDefined();

        expect(qry.runnable.joinMap.length).toEqual(db.Tables.Verb.length);

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

        var joinMap = qry.runnable.joinMap;

        expect(qry.runnable.ops[1].leftField.id).toEqual('v');

        expect(qry.runnable.ops[1].rightField.id).toEqual('c');

        expect(qry.runnable.ops[1].leftField.field).toEqual('VerbID');

        expect(qry.runnable.ops[1].rightField.field).toEqual('VerbID');

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

        expect(fieldRefs[0].field).toBeUndefined();

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

        expect(qry.runnable.joinMap.length).toEqual(2);

        qry = gryst
            .from(db.Tables.Conjugation)
            .where(function (ConjugationID, Yo) {
                return ConjugationID == 12000 || Yo == "hablo" || ConjugationID == 12001;
            });

        // run the where clause
        qry.run();

        expect(qry.runnable.joinMap.length).toEqual(3);

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
            .thenBy("c.Yo")
            .select(function(c, v){
                return {
                    Infinitive: v.Infinitive,
                    Yo: c.Yo
                };
            });

        qry.run();

    });

});

describe('Runnable order', function () {

    it('should apply multiple sorts', function () {

        var qry = new gryst.Query();

        var i;

        qry
            .from(db.Tables.Conjugation, "c")
            .where(function(c){
                return c.Yo != null;
            })
            .join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID")
            .orderByDescending("v.Infinitive")
            .thenBy("c.Yo")
            .select(function(c, v) {
                return {
                    Infinitive: v.Infinitive,
                    Yo: c.Yo
                };
            });

        var sw = new tp.StopWatch();

        sw.start();

        var result = qry.run();

        sw.stop();

        //console.log(sw.laps);

        //for (i = 0; i < 40 && i < result.length; i++) {
        //    console.log(result[i]);
        //}

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

        grouping.addKey(d, s);

        expect(grouping.type).toEqual('date');

        expect(grouping.keys[0]).toEqual(d);

        expect(grouping.map[d.getTime()][0]).toEqual(s);

        // test object

        var obj1 = {Name:'Todd', Phone:'9634'};

        var grouping = new gryst.Grouping();

        grouping.addKey(obj1, "This is a test with an object");

        expect(grouping.type).toEqual('object');

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

});

describe('Group', function () {

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
            expect(result[i].Key).toBeDefined();
            expect(result[i].Values).toBeDefined();
            //console.log(result[i].Values);
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
                return i.Key[0] == 'b';
            }).
            select("i");

        var result = qry.run();

        for (i = 0; i < 5 && i < result.length; i++) {
            expect(result[i].Key).toBeDefined();
            expect(result[i].Values).toBeDefined();
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
                return i.Key.Infinitive[0] == 'b';
            })
            .select("i");

        var result = qry.run();

        for (i = 0; i < 5 && i < result.length; i++) {
            //expect(typeof result[i].Key).toEqual('object');
            //expect(result[i].Key.VerbID).toBeDefined();
            //expect(result[i].Values[0].ConjugationID).toBeDefined();
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
            )
            .select(function(i){return i;});

        var result = qry.run();

        //expect(qry.runnable.ops[2].grouping.type).toEqual('date');

        for (i = 0; i < 5 && i < result.length; i++) {
            expect(result[i].Key instanceof Date).toEqual(true);
            expect(result[i].Values[0].ConjugationID).toBeDefined();
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

        var worked = false;

        for (i = 0; i < 5 && i < qry.length; i++) {
            expect(qry.get(i).Values.Max).toBeDefined();
            expect(qry.get(i).Values.Min).toBeDefined();
            worked = true;
            //console.log(result[i]);
        }

        expect(worked).toEqual(true);

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
            expect(result[i].Values.Max).toBeDefined();
            expect(result[i].Values.Min).toBeDefined();
            //console.log(result[i]);
        }


    });

});

describe('Operation chaining', function(){

    it ('should be able to alternately append operations and re-execute ad nauseum', function(){

        function checkResult(qry, id) {
            var result = qry.run();
            var worked = false;
            for (i = 0; i < 5 && i < qry.length; i++) {
                expect(result[i][id]).toBeDefined();
                //console.log(result[i]);
                worked = true;
            }
            expect(worked).toEqual(true);
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

        checkResult(qry, "Key");

        qry.orderBy("Key");

        checkResult(qry, "Key");

        qry.select("Values");

        checkResult(qry, "Values");

    });

});
