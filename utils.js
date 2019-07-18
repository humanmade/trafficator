const fs = require('fs');

module.exports = {
	getConfig: file => {
		const defaultConfig = require('./config');
		try {
			fs.accessSync(file, fs.constants.R_OK);
			return Object.assign( {}, defaultConfig, require(file) );
		} catch ( err ) {
			throw err;
		}
	},
	getRandom: value => {
		if (Array.isArray(value) && value.length) {
			return value[Math.floor((Math.random() * value.length))];
		}
		return value;
	},
	resolve: async (value, page = null) => {
		if (typeof value === 'function' && page) {
			return await value(page);
		}
		return value;
	},
	log: function () {
		console.log(...arguments, new Date().toISOString());
	}
}
