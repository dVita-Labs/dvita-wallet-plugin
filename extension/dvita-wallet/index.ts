/**
 * Inject to third part pages.
 */

import {
    httpGet,
    getStorage,
    getLocalStorage,
    getNetwork,
    httpPost
} from '../common/index';
import {
    requestTarget,
    Account,
    AccountPublicKey,
    SendArgs,
    GetBlockInputArgs,
    TransactionInputArgs,
    ERRORS,
    mainApi,
    mainRPC,
    testRPC,
    FromBackend,
} from '../common/data_module';
import { getPrivateKeyFromWIF, getPublicKeyFromPrivateKey, sign, str2hexstring, verify, hexstring2str, num2VarInt } from '../common/utils';
import { balanceURL, BalanceResponse } from '../shared';
import { randomBytes } from 'crypto';



declare var chrome: any;


// Note that this script can unilaterally execute the logic in the third-party page, but the third-party page cannot directly manipulate this script, and the message method must be used
// Follow-up to add a dapi for the introduction of third-party pages to hide the realization of message sending and receiving
// You can also dynamically inject scripts into third-party pages. How to use ts for scripts injected in this way is to be considered

const dapi = window.document.createElement('script');
dapi.setAttribute('type', 'text/javascript');
dapi.async = true;
dapi.src = chrome.runtime.getURL('dapi.js');
dapi.onload = () => {
    window.postMessage({
        from: 'dVITAWallet',
        type: 'dapi_LOADED'
    }, '*');
};

window.onload = () => {
    if (window.document.body != null) {
        window.document.body.appendChild(dapi);
    }
};

window.addEventListener('message', async (e) => {
    switch (e.data.target) {
        case requestTarget.Provider: {
            getStorage('rateCurrency', (res) => {
                if (res === undefined) {
                    res = 'EUR';
                }
                const manifestData = chrome.runtime.getManifest();
                manifestData.extra = { currency: res, theme: '' };
                window.postMessage({
                    return: requestTarget.Provider,
                    data: manifestData
                }, '*');
            });
            return;
        }
        case requestTarget.Networks: {
            getStorage('net', (res) => {
                window.postMessage({
                    return: requestTarget.Networks,
                    data: {
                        networks: ['MainNet', 'TestNet'],
                        defaultNetwork: res || 'MainNet'
                    },
                    ID: e.data.ID
                }, '*');
            });
            return;
        }
        case requestTarget.Account: {
            getLocalStorage('wallet', (res: any) => {
                const data: Account = { address: '', label: '' };
                if (res !== undefined && res.accounts[0] !== undefined) {
                    data.address = res.accounts[0].address;
                    data.label = res.name;
                }
                window.postMessage({
                    return: requestTarget.Account,
                    data,
                    ID: e.data.ID
                }, '*');
            });
            return;
        }
        case requestTarget.AccountPublicKey: {
            const walletArr = await getLocalStorage('walletArr-Neo3', () => { });
            const currWallet = await getLocalStorage('wallet', () => { });
            const WIFArr = await getLocalStorage('WIFArr-Neo3', () => { });
            const data: AccountPublicKey = { address: '', publicKey: '' };
            if (currWallet !== undefined && currWallet.accounts[0] !== undefined) {
                const privateKey = getPrivateKeyFromWIF(WIFArr[walletArr.findIndex(item =>
                    item.accounts[0].address === currWallet.accounts[0].address)]
                );
                data.address = currWallet.accounts[0].address;
                data.publicKey = getPublicKeyFromPrivateKey(privateKey);
            }
            window.postMessage({
                return: requestTarget.AccountPublicKey,
                data,
                ID: e.data.ID
            }, '*');
            return;
        }
        case requestTarget.Balance: {
            chrome.runtime.sendMessage(e.data, (response) => {
                return Promise.resolve('Dummy response to keep the console quiet');
            });
            return;
        }

        case requestTarget.Storage: {
            getStorage('net', async (res) => {
                let network = e.data.parameter.network;
                if (network !== 'MainNet' && network !== 'TestNet') {
                    network = res || 'MainNet';
                }
                const apiUrl = network === 'MainNet' ? mainRPC : testRPC;
                httpPost(apiUrl, {
                    jsonrpc: '2.0',
                    method: 'getstorage',
                    params: [e.data.parameter.scriptHash, str2hexstring(e.data.parameter.key)],
                    id: 1
                },(returnRes) => {
                    window.postMessage({
                        return: requestTarget.Storage,
                        data: returnRes.error !== undefined ? null : ({result: hexstring2str(returnRes.result)} || null),
                        ID: e.data.ID,
                        error: returnRes.error === undefined ? null : ERRORS.RPC_ERROR
                    }, '*');
                }, null);
            });
            return;
        }

        case requestTarget.InvokeRead: {
            getStorage('net', async (res) => {
                let apiUrl = e.data.parameter.network;
                const parameter = e.data.parameter;
                if (apiUrl !== 'MainNet' && apiUrl !== 'TestNet') {
                    apiUrl = res || 'MainNet';
                }
                apiUrl = apiUrl === 'MainNet' ? mainRPC : testRPC;
                e.data.network = apiUrl;
                e.data.parameter = [parameter.scriptHash, parameter.operation, parameter.args];
                chrome.runtime.sendMessage(e.data, (response) => {
                    return Promise.resolve('Dummy response to keep the console quiet');
                });
            });
            return;
        }

        case requestTarget.InvokeReadMulti: {
            getStorage('net', async (res) => {
                let apiUrl = e.data.parameter.network;
                if (apiUrl !== 'MainNet' && apiUrl !== 'TestNet') {
                    apiUrl = res || 'MainNet';
                }
                apiUrl = apiUrl === 'MainNet' ? mainRPC : testRPC;
                e.data.network = apiUrl;
                chrome.runtime.sendMessage(e.data, (response) => {
                    return Promise.resolve('Dummy response to keep the console quiet');
                });
            });
            return;
        }

        case requestTarget.Transaction: {
            getStorage('net', async (res) => {
                let network = e.data.parameter.network;
                const parameter = e.data.parameter;
                if (network !== 'MainNet' && network !== 'TestNet') {
                    network = res || 'MainNet';
                }
                e.data.network = network;
                e.data.parameter = [parameter.scriptHash, parameter.operation, parameter.args];
                httpGet(`${mainApi}/v1/neo2/transaction/${parameter.txid}`, (returnRes) => {
                    window.postMessage({
                        return: requestTarget.Transaction,
                        data: returnRes.status !== 'success' ? null : returnRes.data,
                        ID: e.data.ID,
                        error: returnRes.status === 'success' ? null : ERRORS.RPC_ERROR
                    }, '*');
                }, {
                    Network: network === 'MainNet' ? 'mainnet' : 'testnet'
                });
            });
            return;
        }

        case requestTarget.Block: {
            getStorage('net', async (res) => {
                let apiUrl = e.data.parameter.network;
                const parameter = e.data.parameter as GetBlockInputArgs;
                if (apiUrl !== 'MainNet' && apiUrl !== 'TestNet') {
                    apiUrl = res || 'MainNet';
                }
                apiUrl = apiUrl === 'MainNet' ? mainRPC : testRPC;
                httpPost(apiUrl, {
                    jsonrpc: '2.0',
                    method: 'getblock',
                    params: [parameter.blockHeight, 1],
                    id: 1
                },(returnRes) => {
                    window.postMessage({
                        return: requestTarget.Block,
                        data: returnRes.error !== undefined ? null : returnRes.result,
                        ID: e.data.ID,
                        error: returnRes.error === undefined ? null : ERRORS.RPC_ERROR
                    }, '*');
                }, null);
            });
            return;
        }

        case requestTarget.ApplicationLog: {
            getStorage('net', async (res) => {
                let apiUrl = e.data.parameter.network;
                const parameter = e.data.parameter as TransactionInputArgs;
                if (apiUrl !== 'MainNet' && apiUrl !== 'TestNet') {
                    apiUrl = res || 'MainNet';
                }
                apiUrl = apiUrl === 'MainNet' ? mainRPC : testRPC;
                httpPost(apiUrl, {
                    jsonrpc: '2.0',
                    method: 'getapplicationlog',
                    params: [parameter.txid],
                    id: 1
                },(returnRes) => {
                    window.postMessage({
                        return: requestTarget.ApplicationLog,
                        data: returnRes.error !== undefined ? null : returnRes.result,
                        ID: e.data.ID,
                        error: returnRes.error === undefined ? null : ERRORS.RPC_ERROR
                    }, '*');
                }, null);
            });
            return;
        }

        case requestTarget.Invoke: {
            getStorage('net', async (res) => {
                let apiUrl = e.data.parameter.network;
                if (apiUrl !== 'MainNet' && apiUrl !== 'TestNet') {
                    apiUrl = res || 'MainNet';
                }
                e.data.parameter.network = apiUrl;
                chrome.runtime.sendMessage(e.data, (response) => {
                    return Promise.resolve('Dummy response to keep the console quiet');
                });
            });
            return;
        }

        case requestTarget.SignMessage: {
            const parameter = e.data.parameter;
            const walletArr = await getLocalStorage('walletArr-Neo3', () => { });
            const currWallet = await getLocalStorage('wallet', () => { });
            const WIFArr = await getLocalStorage('WIFArr-Neo3', () => { });
            if (currWallet !== undefined && currWallet.accounts[0] !== undefined) {
                const privateKey = getPrivateKeyFromWIF(WIFArr[walletArr.findIndex(item =>
                    item.accounts[0].address === currWallet.accounts[0].address)]
                );
                const randomSalt = randomBytes(16).toString('hex');
                const publicKey = getPublicKeyFromPrivateKey(privateKey);
                const hex = str2hexstring(randomSalt + parameter.message);
                const lengthHex = num2VarInt(hex.length / 2);
                const messageGuaranteedToNotBeTx = '010001f0' + lengthHex + hex + '0000';

                window.postMessage({
                    return: requestTarget.SignMessage,
                    data: {
                        publicKey,
                        data: sign(messageGuaranteedToNotBeTx, privateKey),
                        salt: randomSalt,
                        message: parameter.message
                    },
                    ID: e.data.ID
                }, '*');
            }
            return;
        }

        case requestTarget.Deploy: {
            getStorage('net', async (res) => {
                let network = e.data.parameter.network;
                if (network !== 'MainNet' && network !== 'TestNet') {
                    network = res || 'MainNet';
                }
                e.data.parameter.network = network;
                chrome.runtime.sendMessage(e.data, (response) => {
                    return Promise.resolve('Dummy response to keep the console quiet');
                });
            });
            return;
        }


        case requestTarget.AuthState: {
            getStorage('connectedWebsites', async (res) => {
                const walletArr = await getLocalStorage('walletArr-Neo3', () => { });
                const currWallet = await getLocalStorage('wallet', () => { });
                res = res || {};
                window.postMessage({
                    return: requestTarget.AuthState,
                    data: currWallet ?  res[currWallet.accounts[0].address] || [] : []
                }, '*');
            });
            return;
        }

        case requestTarget.Send: {
            const parameter = e.data.parameter as SendArgs;

            // User trying to just sign an existing transaction, don't make balance any checks
            if (parameter.rawTx && parameter.broadcastOverride) {
                return chrome.runtime.sendMessage(e.data, (response) => {
                    return Promise.resolve('Dummy response to keep the console quiet');
                });
            }

            const network = await getNetwork();

            httpGet(balanceURL(network, parameter.fromAddress), (resBalance: FromBackend<BalanceResponse[]>) => {
                let enough = true; // Have enough money
                let hasAsset = false;  // This address has this asset
                const assets = resBalance.data;
                for (const asset of assets) {
                    if (asset.asset.hash === parameter.asset) {
                        hasAsset = true;
                        if (Number(asset.amount) < Number(parameter.amount)) {
                            enough = false;
                        }
                        break;
                    }
                }
                if (enough && hasAsset) {
                    chrome.runtime.sendMessage(e.data, (response) => {
                        return Promise.resolve('Dummy response to keep the console quiet');
                    });
                } else {
                    window.postMessage({
                        return: requestTarget.Send,
                        error: ERRORS.INSUFFICIENT_FUNDS,
                        ID: e.data.ID
                    }, '*');
                    return;
                }
            }, {
                Network: network === 'MainNet' ? 'mainnet' : 'testnet'
            });

            return;
        }
        case requestTarget.Connect: {
            chrome.runtime.sendMessage(e.data, (response) => {
                return Promise.resolve('Dummy response to keep the console quiet');
            });
            return
        }
        case requestTarget.Login: {
            getLocalStorage('shouldLogin', res => {
                if(res === true || res === 'true') {
                    chrome.runtime.sendMessage(e.data, (response) => {
                        return Promise.resolve('Dummy response to keep the console quiet');
                    });
                } else {
                    window.postMessage({
                        return: requestTarget.Login,
                        data: true
                    }, '*');
                }
            })
        }
    }
}, false);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request != null) {
        window.postMessage(request, '*');
        sendResponse('');
        return Promise.resolve('Dummy response to keep the console quiet');
    }
});


