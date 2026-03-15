Place app icons here for the packaged builds:

  icon.icns   — macOS (1024x1024 recommended; use iconutil to generate)
  icon.ico    — Windows (256x256 multi-resolution ICO)
  icon.png    — Linux (512x512 PNG)
  icons/      — Linux: 16.png, 32.png, 48.png, 64.png, 128.png, 256.png, 512.png

electron-builder will use these automatically when building.
If the files are missing, electron-builder uses the default Electron icon.
