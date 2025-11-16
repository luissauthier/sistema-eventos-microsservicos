// electron-forge.config.js
const { VitePlugin } = require('@electron-forge/plugin-vite');

module.exports = {
  packagerConfig: {
    icon: "./icon",
  },

  rebuildConfig: {},

  makers: [
    { name: "@electron-forge/maker-squirrel", config: {} },
    { name: "@electron-forge/maker-zip", platforms: ["win32", "linux", "darwin"] },
    { name: "@electron-forge/maker-deb", config: {} },
    { name: "@electron-forge/maker-rpm", config: {} }
  ],

  plugins: [
    new VitePlugin({
      build: [
        {
          // MAIN
          entry: "src/main/main.js",
          config: "vite.main.config.mjs",
        },
        {
          // PRELOAD
          entry: "src/main/preload.js",
          config: "vite.preload.config.mjs",
        }
      ],

      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mjs",
        }
      ]
    })
  ]
};
