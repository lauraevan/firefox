/* Standalone webpack config for the local preview harness (not shipped).
 * Bundles React in directly so the output HTML needs no externals. */

const path = require("path");
const newtabRoot = path.join(__dirname, "..");

module.exports = {
  mode: "development",
  devtool: false,
  entry: path.join(__dirname, "harness.jsx"),
  output: {
    path: path.join(__dirname, "dist"),
    filename: "harness.bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: { presets: ["@babel/preset-react"] },
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".mjs"],
    modules: [path.join(newtabRoot, "node_modules"), newtabRoot],
  },
};
