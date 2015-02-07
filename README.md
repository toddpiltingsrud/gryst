# gryst
An extensible JavaScript query engine

Gryst is a query engine for JavaScript. I originally built it for a Spanish verb conjugation study tool I was building. That's why there are tables with Spanish verbs in them.

Gryst is different from most other querying protocols you might have encountered because it doesn't require a specific order to the query syntax (select, from, join, where, etc.). Instead, Gryst queries are constructed of operations that are chained together and executed in sequence to create structured result sets. Further, Gryst is extensible. You can create your own custom operations that can be added to Gryst query chains to meet your specific requirements.

Froms and Joins create a master join map consisting of row indexes from each table. The first From does the initial population. Subsequent join operations supplement the map with indexes from other tables by intersecting between common keys. This typically expands the join map when joining on one-to-many relationships because the parent table's indexes are copied for every row in the child table. But it also automatically filters out rows that are not common to both tables. 

```javascript
var qry = gryst.
    from(db.Tables.Conjugation, "c").
    join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID");
```

To create a cross join, use multiple "from" functions:

```javascript
var qry = gryst.
    from("c", "Customers").
    from("v", "Vendors");
```

The first "from" populates the join map with all the row indexes from the Customers table. Then second "from" iterates through a nested loop, adding indexes from the Vendors table for each index already in the join map.

Once the join map is created, the rest of the operations modify it in some way.

Where clauses take a function as an argument that returns a boolean value. Where clauses iterate over the join map, retrieving the table rows indicated by the map and passing them to the function. If the function returns false, those indexes are removed from the join map.

```javascript
var qry =
    gryst.from(db.Tables.Conjugation, "c").
        join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID").
        where(function(c){
            return c.Yo != null;
        });
```

Sort operations are initialized with a table ID, a field name, and a direction (ascending or descending). A sort can also have a child sort, added by calls to the "thenBy" functions, creating a chain. Each sort is passed a set of indexes from the join map (the first sort is passed the entire map). The sort then retrieves the rows indicated by the indexes and sorts them by the field values. If a sort has a child sort, it splits up its map by the field values to create an array of sub maps which are then handed off to the child sort one at a time. Each child sort does the same thing, sorting its chunk of the join map, splitting it up into more chunks, handing the chunks off to its child sort, and so on. The end result is a sorted join map.

```javascript
var qry = new gryst.Query()
    .from(db.Tables.Conjugation, "c")
    .join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID")
    .orderBy("v.Infinitive")
    .thenBy("c.Yo");
```

The join map has been created, filtered, and sorted. Next up: grouping. The Group operation takes 3 arguments: group, key, and group ID. The group and key arguments can be a function, a table ID, or a field name. The group ID will be the name used to access your grouping later on. The Group operation is quite flexible. It can group on any JavaScript type, including arbitrary objects and arrays. A group operation creates a completely new join map, overwriting the previous one. But you are free to append additional operations after the grouping such as joins, wheres, sorts, more groups, and selects, all of which should refer to the last group you created.

```javascript
var qry = gryst.
    from(db.Tables.Conjugation, "c").
    group(function(c){
        return gryst.from(c).select("Yo").run();
    }, "c.TenseID", "i");
    
// or...

var qry =
    gryst.from(db.Tables.Conjugation, "c").
    join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID").
    where(function(c){
        return c.Yo != null;
    }).
    group("c.Yo", "v.Infinitive", "i");
```
    
Next, the Select operation. Use this as a way to "compose" the result and add structure to it. It takes 2 arguments: a function and an optional ID. The select operation iterates through the join map and passes table rows to the function. The function rearranges row objects passed in. The returned result is added to a new table, identified by the optional ID you supplied (if an ID isn't specified, gryst creates one for you). Finally, a new join map is created for the table, replacing the old one. Supplying your own ID is useful if you wish to keep building out the query, because you don't have to stop with the Select operation. You can join more tables, wheres, sorts, etc onto the table you created in your Select operation. You can even add more Selects, creating yet more named table instances that can be queried further. It all just becomes more grist for the mill.

```javascript
var qry = gryst.
    from(db.Tables.Conjugation, "c").
    where(function(c){
        return c.Yo != null;
    }).
    join(db.Tables.Verb, "v", "c.VerbID", "v.VerbID").
    orderByDescending("v.Infinitive").
    thenBy("c.Yo").
    select(function(c, v) {
        return {
            ID: c.ConjugationID,
            Infinitive: v.Infinitive,
            Yo: c.Yo
        };
    });
```

There are a couple more operations we should discuss. But I wanted to save them for last to demonstrate how Gryst can be extended with your own custom operations.

Skip & Take

The 'extend' function can be used to add custom operations to gryst. It takes 3 arguments: the name of the operation, a constructor function containing a 'run' function, and (optionally) an array of strings declaring some injectables. This last argument is a technique borrowed from angular.js. If you minify your code, then you'll need to use the last argument to tell gryst what to inject into your function because most compilers will minimize your function arguments.

I've used the extend function to implement 'skip' and 'take' operations:

```javascript
gryst.extend("skip", function (count, $getJoinMap, $setJoinMap) {
    this.run = function () {
        var map = $getJoinMap().slice(count);
        $setJoinMap(map);
        return map;
    };
}, ['$getJoinMap', '$setJoinMap']);

gryst.extend("take", function (count, $getJoinMap, $setJoinMap) {
    this.run = function () {
        var map = $getJoinMap().slice(0, count);
        $setJoinMap(map);
        return map;
    };
}, ['$getJoinMap', '$setJoinMap']);
```
