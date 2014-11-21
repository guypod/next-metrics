var _       = require('lodash');
var os      = require('os');
    
var metrics = require('metrics');


var System = module.exports = function System() {
   
    var versionTokens = process.version.split('.');
    
    this.nodeVersion = { 
        major: parseInt(versionTokens[0]) || 0,
        minor: parseInt(versionTokens[1]),
        patch: parseInt(versionTokens[2])
    };
    
    this.counters = {
        'system.process.mem_process_rss': new metrics.Counter,
        'system.process.mem_process_heapTotal': new metrics.Counter,
        'system.process.mem_process_heapUsed': new metrics.Counter,
        'system.process.load_average_1m': new metrics.Counter
    }
}

System.prototype.instrument = function (req) {
    var self = this;
    setInterval(function () {
        var mem = process.memoryUsage();
        self.counters['system.process.mem_process_rss'].count = mem.rss;
        self.counters['system.process.mem_process_heapTotal'].count = mem.heapTotal;
        self.counters['system.process.mem_process_heapUsed'].count = mem.heapUsed;
        self.counters['system.process.load_average_1m'].count = _.first(os.loadavg());
    }, 5000)
}

System.prototype.counts = function () {
    return {
        'system.os.cpus': os.cpus().length, 
        'system.procees.uptime': process.uptime(), 
        'system.process.version.major': this.nodeVersion.major, 
        'system.process.version.minor': this.nodeVersion.minor, 
        'system.process.version.patch': this.nodeVersion.patch, 
        'system.process.mem_process_rss': this.counters['system.process.mem_process_rss'].count,
        'system.process.mem_process_heapTotal': this.counters['system.process.mem_process_heapTotal'].count,
        'system.process.mem_process_heapUsed': this.counters['system.process.mem_process_heapUsed'].count,
        'system.process.load_average_1m': this.counters['system.process.load_average_1m'].count
    }
}