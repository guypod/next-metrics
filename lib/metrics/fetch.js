/*eslint new-cap: 1*/
'use strict';
var metrics = require('metrics');
var services = require('./services');

var Fetch = function() {
	this.counters = {};
};

Fetch.prototype.instrument = function(opts) {
	opts = opts || {};

	if (!GLOBAL.fetch) {
		throw 'You need to require(\'isomorphic-fetch\'); before instrumenting it';
	}
	if (GLOBAL.fetch._instrumented) {
		return console.warn('You can only instrument fetch once. Remember, if you\'re using next-express metrics for most fetch calls are setup automatically');
	}

	this.serviceMatchers = services;
	this.onUninstrumented = opts.onUninstrumented || function() {};
	this.serviceNames = Object.keys(services);

	this.serviceNames.forEach(function(service) {
		this.counters['fetch_' + service + '_requests'] = new metrics.Counter();
		this.counters['fetch_' + service + '_status_2xx'] = new metrics.Counter();
		this.counters['fetch_' + service + '_status_2xx_response_time'] = new metrics.Histogram.createUniformHistogram();
		this.counters['fetch_' + service + '_status_3xx'] = new metrics.Counter();
		this.counters['fetch_' + service + '_status_3xx_response_time'] = new metrics.Histogram.createUniformHistogram();
		this.counters['fetch_' + service + '_status_4xx'] = new metrics.Counter();
		this.counters['fetch_' + service + '_status_5xx'] = new metrics.Counter();
		this.counters['fetch_' + service + '_status_failed'] = new metrics.Counter();
		this.counters['fetch_' + service + '_status_timeout'] = new metrics.Counter();
	}.bind(this));

	require('../metrics').registerAggregator(this.reporter.bind(this));

	var _fetch = GLOBAL.fetch;

	var that = this; // not using bind as don't want to muck around with fetch's scope

	GLOBAL.fetch = function(url) {
		var service;
		that.serviceNames.some(function(name) {
			if (that.serviceMatchers[name].test(url)) {
				service = name;
				return true;
			}
		});
		if (service) {
			var prefix = 'fetch_' + service;
			that.counters[prefix + '_requests'].inc(1);

			var start = new Date();

			return _fetch.apply(this, arguments)
							.then(function(res) {
								var statusType = res.status ? ('' + res.status).charAt(0) + 'xx' : '2xx';
								var timer = that.counters[prefix + '_status_' + statusType + '_response_time'];
								if (timer) {
									timer.update(new Date() - start);
								}
								that.counters[prefix + '_status_' + statusType].inc(1);
								return res;
							})
							.catch(function(err) {
								if (/timeout/i.test(err.message)) {
									that.counters[prefix + '_status_timeout'].inc(1);
								} else {
									that.counters[prefix + '_status_failed'].inc(1);
								}
								throw err;
							});

		} else {
			that.onUninstrumented.apply(this, arguments);
			return _fetch.apply(this, arguments);
		}
	};

	GLOBAL.fetch._instrumented = true;
	GLOBAL.fetch.restore = function() {
		GLOBAL.fetch = _fetch;
	};
};

Fetch.prototype.reporter = function() {

	var obj = {};

	this.serviceNames.forEach(function(service) {
		var inputPrefix = 'fetch_' + service;
		var outputPrefix = 'fetch.' + service;

		obj[outputPrefix + '.count'] = this.counters[inputPrefix + '_requests'].count;
		this.counters[inputPrefix + '_requests'].clear();

		const histo2xx = this.counters[inputPrefix + '_status_2xx_response_time'];
		const percentiles2xx = histo2xx.percentiles([0.5, 0.95]);
		obj[outputPrefix + '.response.status_2xx.response_time.mean'] = histo2xx.mean();
		obj[outputPrefix + '.response.status_2xx.response_time.min'] = histo2xx.min;
		obj[outputPrefix + '.response.status_2xx.response_time.max'] = histo2xx.max;
		obj[outputPrefix + '.response.status_2xx.response_time.median'] = percentiles2xx[0.5];
		obj[outputPrefix + '.response.status_2xx.response_time.95th'] = percentiles2xx[0.95];
		histo2xx.clear();

		obj[outputPrefix + '.response.status_2xx.count'] = this.counters[inputPrefix + '_status_2xx'].count;
		this.counters[inputPrefix + '_status_2xx'].clear();

		const histo3xx = this.counters[inputPrefix + '_status_3xx_response_time'];
		const percentiles3xx = histo3xx.percentiles([0.5, 0.95]);
		obj[outputPrefix + '.response.status_3xx.response_time.mean'] = histo3xx.mean();
		obj[outputPrefix + '.response.status_3xx.response_time.min'] = histo3xx.min;
		obj[outputPrefix + '.response.status_3xx.response_time.max'] = histo3xx.max;
		obj[outputPrefix + '.response.status_3xx.response_time.median'] = percentiles3xx[0.5];
		obj[outputPrefix + '.response.status_3xx.response_time.95th'] = percentiles3xx[0.95];
		histo3xx.clear();

		obj[outputPrefix + '.response.status_3xx.count'] = this.counters[inputPrefix + '_status_3xx'].count;
		this.counters[inputPrefix + '_status_3xx'].clear();

		obj[outputPrefix + '.response.status_4xx.count'] = this.counters[inputPrefix + '_status_4xx'].count;
		this.counters[inputPrefix + '_status_4xx'].clear();

		obj[outputPrefix + '.response.status_5xx.count'] = this.counters[inputPrefix + '_status_5xx'].count;
		this.counters[inputPrefix + '_status_5xx'].clear();

		obj[outputPrefix + '.response.status_failed.count'] = this.counters[inputPrefix + '_status_failed'].count;
		this.counters[inputPrefix + '_status_failed'].clear();

		obj[outputPrefix + '.response.status_timeout.count'] = this.counters[inputPrefix + '_status_timeout'].count;
		this.counters[inputPrefix + '_status_timeout'].clear();

	}.bind(this));

	return obj;
};

module.exports = Fetch;
