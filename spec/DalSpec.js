// configure the table tests
if (!window.testconfig) {
    window.testconfig = {
        db: new gryst.JSDB()
    };

    window.testconfig.db.setTable(espanol.Verb);
    window.testconfig.db.setTable(espanol.Conjugation);
    window.testconfig.db.setTable(espanol.Tense);
    window.testconfig.db.setTable(espanol.Mood);
}

var db = window.testconfig.db;

xdescribe('gryst.JSDB: add a table', function () {

    it('should have a table defined', function () {

        expect(db.Tables.Conjugation).toBeDefined();

    });

});

xdescribe('gryst.JSDB: adding a table twice', function () {

    it('should throw an exception', function () {

        var f = function () {
            db.setTable(Verb);
        };

        expect(f).toThrow();

    });

});

xdescribe('gryst.JSDB: getKeyOrdinal', function () {

    it('should find column ordinal', function () {

        var ordinal = db.Tables.Conjugation.getKeyOrdinal();

        expect(ordinal).toEqual(0);
    });

});

xdescribe('gryst.JSDB: getColumnOrdinal', function () {

    it('should find a column', function () {

        var last = db.Tables.Conjugation.Columns.length - 1;

        var columnName = db.Tables.Conjugation.Columns[last].ColumnName;

        var ordinal = db.Tables.Conjugation.getColumnOrdinal(columnName);

        expect(ordinal).toEqual(last);
    });

});

xdescribe('gryst.JSDB: findByKey', function () {

    it('should find a row', function () {

        var row = db.Tables.Conjugation.findByKey(15000);

        expect(row.ConjugationID).toEqual(15000);


    });

});

xdescribe('gryst.JSDB: Map performance', function () {

    it('should be on par with a plain object', function () {

        var verbID, rowIndex;
        var map, dict;
        var qry = new Query();
        var sw = new gryst.StopWatch();

        sw.start();

        // create a Map instead of an index
        map = qry.ensureMap(db.Tables.Conjugation, "VerbID");

        sw.lap();

        // find rows using the map
        db.Tables.Conjugation.forEach(function(row){
            verbID = row.VerbID;
            rowIndex = map[verbID];
            expect(rowIndex.length).toBeGreaterThan(-1);
        });

        sw.stop();

        console.log("map performance:");

        console.log(sw.laps);

        //// now test object-based index
        //sw.start();
        //
        //dict = qry.ensureDict(db.Tables.Conjugation, "VerbID");
        //
        //sw.lap();
        //
        //// find rows using the dict
        //db.Tables.Conjugation.forEach(function(row) {
        //    verbID = row.VerbID;
        //    rowIndex = dict[verbID.toString()];
        //    expect(rowIndex.length).toBeGreaterThan(-1);
        //});
        //
        //sw.stop();
        //
        //console.log("object performance:");
        //
        //console.log(sw.laps);

        expect(map).toBeDefined();
    });

});

