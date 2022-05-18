const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env = "") => {
    const compat = env.includes("neoline-compatible")
        ? [new webpack.NormalModuleReplacementPlugin(/compat\.ts/, './compat.neoline.ts')]
        : [];

    return [{
        mode: "production",
        optimization: {
            minimize: false
        },
        entry: {
            "background": "./extension/background/index.ts"
        },
        output: {
            filename: "[name].js",
            path: path.resolve(__dirname, '../dist'),
        },
        devtool: false,
        resolve: {
            extensions: [".ts", ".js"]
        },
        module: {
            rules: [
                {
                    test: /.ts$/,
                    use: "ts-loader?configFile=extension/tsconfig.json",
                    exclude: /node_modules/
                }
            ]
        },
        plugins: [
            new CopyWebpackPlugin({
                patterns: [
                    "extension/manifest.json"
                ]
            }),
            ...compat,
        ]
    }, {
        mode: "production",
        optimization: {
            minimize: false
        },
        entry: {
            "dvita-wallet": "./extension/dvita-wallet/index.ts",
            "dapi": "./extension/dapi/entry.ts",
            "common": "./extension/common/index.ts",
            "data_module": "./extension/common/data_module.ts"
        },
        output: {
            filename: "[name].js",
            path: path.resolve(__dirname, '../dist'),
        },
        devtool: false,
        resolve: {
            extensions: [".ts", ".js"]
        },
        module: {
            rules: [
                {
                    test: /.ts$/,
                    use: "ts-loader?configFile=extension/tsconfig.json",
                    exclude: /node_modules/
                }
            ]
        },
        plugins: [
            ...compat,
        ],
    }];
}
