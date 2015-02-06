var espanol = espanol || {};
espanol.Mood = {
    "TableName": "Mood",
    "Columns": [{
        "ColumnName": "MoodID",
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
    "Data": [[5, "Indicativo", "Indicative"], [6, "Subjuntivo", "Subjunctive"], [7, "Imperativo Afirmativo", "Imperative Affirmative"], [8, "Imperativo Negativo", "Imperative Negative"]]
};