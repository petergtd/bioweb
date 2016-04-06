var path = require("path");
var CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
var ProvidePlugin = require('webpack/lib/ProvidePlugin');

module.exports = {
    entry:  {
      manhattan: './src/manhattan',
      phenotypeScore: './src/phenotypeScore',
    },
    output: {
        path:     'builds',
        filename: '[name].bundle.js',
        chunkFilename: "[id].chunk.js",
    },
    plugins: [
        new CommonsChunkPlugin({
            filename: "commons.js",
            name: "commons"
        }),
        new ProvidePlugin({
          $: "jquery",
          jQuery: "jquery",
        }),
        new ProvidePlugin({
          _: "lodash",
        }),
        new ProvidePlugin({
          d3: "d3",
        }),
    ],
    module: {
        loaders: [
            {
                test:   /\.js/,
                loader: 'babel',
                exclude: /(node_modules|bower_components)/,
                query: {
                    presets: ['es2015']
                },
            },
        ],
    },
};
