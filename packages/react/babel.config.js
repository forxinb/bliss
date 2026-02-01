module.exports = function (api) {
  const isReactNative = api.caller((caller) => caller && caller.name === 'metro');
  const env = api.env();

  return {
    presets: isReactNative
      ? ['module:metro-react-native-babel-preset']
      : [
          ['@babel/preset-env', {
            targets: env === 'module' ? { esmodules: true } : { node: 'current' },
            modules: env === 'module' ? false : 'commonjs'
          }],
          ['@babel/preset-react', {
            runtime: 'automatic'
          }]
        ],
  };
};
