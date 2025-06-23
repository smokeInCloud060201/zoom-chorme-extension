const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
    mode: 'production',
    entry: {
        content: './src/content.js',
        widget: './src/widget/widget.js'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: '.' },
                { from: 'src/widget/widget.css', to: '.' },
                { from: 'src/widget/widget.html', to: '.' },
                { from: 'src/widget/widget.js', to: '.' },
                { from: 'src/widget/widget.service.js', to: '.' },
                { from: 'src/util/utils.js', to: '.' },
            ]
        }),
        // new BundleAnalyzerPlugin(),
    ],
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    },
};
