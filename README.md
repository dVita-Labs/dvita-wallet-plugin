# dVITA Wallet Chrome Extension

dVITA Wallet is a thin wallet chrome extension, it provides dapis for developers who want to interact easily with dVITA blockchain.

## Development

1. Ensure you have [angular-cli](https://angular.io/cli) installed.
2. Clone this repository.
3. Run `npm install` to install dependencies.
4. Run `npm run start` for local development.
5. Run `npm run build` to build release assets for [chrome extension debug](https://developer.chrome.com/extensions/tut_debugging).

### Build dev version which is compatible with Neoline API

1. `npm run build`
2. `npm run build:crx:neoline-compatible`


### Download plugin from github and install manully

1. Got to [wallet plugin releases](https://github.com/dVita-Labs/wallet-plugin/releases)
2. Download lgcfnabglncfoejaghchlehnnmjgdncc_main.crx
3. Open google chrome manage extensions page [chrome://extensions/](chrome://extensions/)
4. Drag and drop this file to extension page