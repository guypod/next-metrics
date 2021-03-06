'use strict';

/*global it, describe*/

var serviceMatchers = require('../lib/metrics/services');
var assert = require('chai').assert;
describe('fetch metrics', function() {

	it('service metrics should not have dots (.) in their name', function() {
		var services = Object.keys(serviceMatchers);
		services.forEach(function(service) {
			assert.strictEqual(service.indexOf('.'), -1, 'service matcher `' + service + '`\'s name must not contain a dot (.)');
		});

	});

});
