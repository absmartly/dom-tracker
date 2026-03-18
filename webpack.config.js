const path = require('path');

const BUILDS = {
  default: {
    entry: './src/index.ts',
    filename: 'dom-tracker.min.js',
    library: 'ABsmartlyDOMTracker',
  },
  full: {
    entry: './src/index.ts',
    filename: 'dom-tracker.full.min.js',
    library: 'ABsmartlyDOMTrackerFull',
  },
};

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const buildType = env?.BUILD_TYPE || 'all';

  const createConfig = (buildKey, buildInfo) => ({
    entry: buildInfo.entry,
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? buildInfo.filename : buildInfo.filename.replace('.min.js', '.dev.js'),
      library: { name: buildInfo.library, type: 'umd' },
      globalObject: 'this',
    },
    resolve: { extensions: ['.ts', '.js'] },
    module: {
      rules: [{ test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ }],
    },
    devtool: isProduction ? false : 'source-map',
  });

  if (buildType === 'all') {
    return Object.entries(BUILDS).map(([key, info]) => createConfig(key, info));
  }
  const buildInfo = BUILDS[buildType];
  if (!buildInfo) throw new Error('Unknown build type: ' + buildType);
  return createConfig(buildType, buildInfo);
};
