gryst.extend("skip", function (count, $getJoinMap, $setJoinMap) {
    this.run = function () {
        gryst.log('skip: ' + count);
        var map = $getJoinMap().slice(count);
        $setJoinMap(map);
        return map;
    };
}, ['$getJoinMap', '$setJoinMap']);

gryst.extend("take", function (count, $getJoinMap, $setJoinMap) {
    this.run = function () {
        gryst.log('take: ' + count);
        var map = $getJoinMap().slice(0, count);
        $setJoinMap(map);
        return map;
    };
}, ['$getJoinMap', '$setJoinMap']);
