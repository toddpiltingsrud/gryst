/**
 * Created by Piltingsrud on 12/21/2014.
 */
'use strict';

// global namespace
var tp = tp || {};

(function() {

    if ('StopWatch' in tp) {
        return;
    }

    tp.StopWatch = function () {
        var self = this;
        this.startedAt = 0;
        this.pausedAt = -1;
        this.laps = [];

        // custom properties
        Object.defineProperty(this, "elapseTime", {
            get: function () {
                return Date.now() - self.startedAt;
            }
        });

        Object.defineProperty(this, "lastLap", {
            get: function () {
                return self.laps.length > 0 ? self.laps[self.laps.length - 1] : -1;
            }
        });

        Object.defineProperty(this, "isPaused", {
            get: function () {
                return (self.pausedAt > -1);
            }
        });
    };

    tp.StopWatch.prototype.start = function () {
        this.laps = [];
        this.startedAt = Date.now();
        return this;
    };

    tp.StopWatch.prototype.lap = function () {
        this.laps.push(this.elapseTime);
        return this.lastLap;
    };

    tp.StopWatch.prototype.pause = function () {
        if (this.isPaused === false) {
            this.pausedAt = Date.now();
        }
    };

    tp.StopWatch.prototype.resume = function () {
        // add the amount of time we paused to startedAt
        this.startedAt += (Date.now() - this.pausedAt);
        this.pausedAt = -1;
        return this.elapseTime;
    };

    tp.StopWatch.prototype.stop = tp.StopWatch.prototype.lap;
})();

