const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    devtool: false,
    entry: {
        content: './src/content.js',
        widget: './src/widget/widget.js',
        background: './src/background.js',
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
                { from: 'src/util/patch-interceptors.js', to: '.' },
                { from: "src/zoom", to: "zoom" },
                { from: "rules.json", to: "." },
                { from: "src/icons", to: "icons" },
            ]
        }),
    ],
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    },
};
