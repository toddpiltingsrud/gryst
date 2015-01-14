var espanol = espanol || {};
espanol.Tense = {
    "TableName": "Tense",
    "Columns": [{
        "ColumnName": "TenseID",
        "IsKey": true,
        "AllowDBNull": false,
        "IsReadOnly": true,
        "DataTypeName": "int",
        "ParentTableName": null,
        "ParentColumnName": null,
        "IsForeignKey": false
    }, {
        "ColumnName": "Spanish",
        "IsKey": false,
        "AllowDBNull": false,
        "IsReadOnly": false,
        "DataTypeName": "nvarchar",
        "ParentTableName": null,
        "ParentColumnName": null,
        "IsForeignKey": false
    }, {
        "ColumnName": "English",
        "IsKey": false,
        "AllowDBNull": false,
        "IsReadOnly": false,
        "DataTypeName": "varchar",
        "ParentTableName": null,
        "ParentColumnName": null,
        "IsForeignKey": false
    }],
    "Data": [[21, "Condicional", "Conditional"], [22, "Condicional perfecto", "Conditional Perfect"], [23, "Futuro", "Future"], [24, "Futuro perfecto", "Future Perfect"], [25, "Imperfecto", "Imperfect"], [26, "Pluscuamperfecto", "Past Perfect"], [27, "Presente", "Present"], [28, "Presente perfecto", "Present Perfect"], [29, "Pretérito", "Preterite"], [30, "Pretérito anterior", "Preterite (Archaic)"]]
};