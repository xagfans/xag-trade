# XAG Trade

XAG Trade is a client for Xrpalike Gene network. It allows you to encrypt your mnemonic/secret key and store it as a file locally on your computer.

## Key Features

- No registration. Secret key and login information stored locally.
- Sign transaction local and then submit.
- Send/receive/convert XAG, assets and tokens.
- Buy/sell XAG, assets and tokens.
- Manage trust lines, account data.
- View balances and history.

## Deployment

You can either deploy it on your web server or build a desktop client using nwjs.

## Build

You should have Node.js installed. 

- Run `npm install` to prepare. 

That is it! You can then deploy it on your web server.

If  you want to build a desktop client.

- Run `npm start` to develop.
- Run `npm run dist` to build. You can use `npm run mac`, `npm run win` or `npm run linux` to build application according your system.

You need to replace the ffmpeg.dll as there is a .mp4 video when login. You can download it from [FFmpeg prebuilt for NW.js](https://github.com/iteufel/nwjs-ffmpeg-prebuilt).