'use strict';

/* global jest */

/**
 * Mock for mediawiki.router module (provided by MediaWiki ResourceLoader at runtime).
 */
module.exports = {
	navigate: jest.fn(),
	addRoute: jest.fn(),
	checkRoute: jest.fn()
};
