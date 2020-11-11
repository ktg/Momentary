const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	entry: './moment.ts',
	devtool: 'inline-source-map',
	mode: "development",
	plugins: [
		new CopyPlugin({patterns: [{from: 'static'}]})
	],
	module: {
		rules: [
			{
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.ts', '.js']
	},
	output: {
		filename: 'moment.js',
		path: path.resolve(__dirname, '../../server')
	}
};