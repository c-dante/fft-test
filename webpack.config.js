const path = require('path');

const webpack = require('webpack');

const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const APP_PATH = path.resolve(__dirname, 'src');

/**
 * splitChunks plugin config -- separate your build into hash-able chunks for loading/caching
 *
 * @see https://webpack.js.org/plugins/split-chunks-plugin/
 */
const splitChunks = {
	chunks: 'async',
	minSize: 100,
	maxSize: 0,
	minChunks: 1,
	maxAsyncRequests: 5,
	maxInitialRequests: 3,
	automaticNameDelimiter: '~',
	name: true,
	cacheGroups: {
		vendors: {
			test: /[\\/]node_modules[\\/]/,
			chunks: 'all',
			priority: -10,
		},
		styles: {
			name: 'styles',
			test: /\.css$/,
			chunks: 'all',
			enforce: true,
		},
		default: {
			minChunks: 2,
			priority: -20,
			reuseExistingChunk: true,
		},
	},
};

const basePlugins = [
	// Build the app
	new HtmlWebpackPlugin({
		title: 'App',
		chunksSortMode: 'dependency',
		meta: {
			'viewport': 'minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no',
			'mobile-web-app-capable': 'yes',
		},
		excludeChunks: ['app'],
	}),
	new ScriptExtHtmlWebpackPlugin({
		sync: [
			/vendors.*\.js/,
		],
		defaultAttribute: 'async',
	}),
	new ForkTsCheckerWebpackPlugin({
		eslint: true,
	}),
	new CircularDependencyPlugin({
		// exclude detection of files based on a RegExp
		exclude: /node_modules/,
		// add errors to webpack instead of warnings
		failOnError: true,
		// allow import cycles that include an asyncronous import,
		// e.g. via import(/* webpackMode: "weak" */ './file.js')
		allowAsyncCycles: false,
		// set the current working directory for displaying module paths
		cwd: __dirname, // always relative to the webpack.config
	}),
];

const devPlugins = [
	new webpack.SourceMapDevToolPlugin({
		filename: '[file].map[query]',
		// module: false,
		// If this gets slow exclude vendors
		// exclude: /vendors.*\.js/,
	}),
	new webpack.HotModuleReplacementPlugin(),
];

const prodPlugins = [
	new CleanWebpackPlugin(),

	// @see https://webpack.js.org/plugins/mini-css-extract-plugin/
	new MiniCssExtractPlugin({
		filename: '[name].[contenthash].css',
	}),
];


const prodOptimization = {
	minimizer: [
		new TerserPlugin({
			cache: true,
			parallel: true,
			sourceMap: true, // Must be set to true if using source-maps in production
			terserOptions: {
				// https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
			},
		}),
		new OptimizeCSSAssetsPlugin({}),
	],
};

module.exports = ({
	production = false,
} = {}) => {
	// configure plugins/etc
	const mode = production ? 'production' : 'development';

	const plugins = [
		...(production ? prodPlugins : devPlugins),
		...basePlugins,
	];

	const optimization = {
		splitChunks,
		...(production ? prodOptimization : {}),
	};

	return {
		mode,
		plugins,
		optimization,
		entry: APP_PATH,

		resolve: {
			extensions: ['.ts', '.tsx', '.js', '.json'],
		},

		module: {
			rules: [
				{
					loader: 'babel-loader',
					test: /\.(ts|js)x?$/,
					exclude: /node_modules/,
				},
			],
		},

		output: {
			filename: production ? '[name].[contenthash].bundle.js' : '[name].bundle.js',
			publicPath: './',
			path: path.resolve(__dirname, 'dist'),
		},
		// Development settings
		devServer: {
			host: '0.0.0.0',
			publicPath: '/',
			hot: true,
			// This is configured to allow client side cors request to some other server
			// @see: https://webpack.js.org/configuration/dev-server/#devserver-proxy
			proxy: {
				'/api': {
					changeOrigin: true,
					target: 'https://api.example.com/',
					pathRewrite: {'^/api' : ''},
					secure: false,
				},
			},
		},

	}
};
