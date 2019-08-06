const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	entry: './bundle.ts',
	devtool: 'inline-source-map',
	mode: "development",
	plugins: [
		new CopyPlugin([
			{ from: 'static' }
		])
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
		filename: 'bundle.js',
		path: path.resolve(__dirname, '../../server/static')
	}
};