/// <reference types="chrome"/>
export {
    getStorage,
    httpGet,
    httpPost,
    setStorage,
    removeStorage,
    clearStorage,
    setLocalStorage,
    removeLocalStorage,
    clearLocalStorage,
    getLocalStorage
} from '../common';
import {
    getStorage,
    setStorage,
    httpPost,
    httpGet,
    setLocalStorage,
    getNetwork,
    getLocalStorage
} from '../common';
import {
    requestTarget,
    GetBalanceArgs,
    BalanceRequest,
    ERRORS,
    mainApi,
    EVENT,
    mainRPC,
    testRPC,
    InvokeReadMultiArgs,
    FromBackend,
    BalanceResults,
    Balance,
} from '../common/data_module';
import {
    reverseHex,
    getScriptHashFromAddress,
    hexstring2str
} from '../common/utils';
import { balanceURL, BalanceResponse } from '../shared';

let currLang = 'en';
let tabCurr: any;
export let password = '';

export let haveBackupTip: boolean = null;

export const version = chrome.runtime.getManifest().version;

chrome.windows.onRemoved.addListener(() => {
    chrome.tabs.query({}, (res) => {
        if (res.length === 0) { // All browsers are closed
            setLocalStorage({
                shouldLogin: true
            });
        }
    });
});

const popupProps = {
    width: 386,
    height: 620,
    type: 'popup' as const,
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.target) {
        case requestTarget.Send:
            {
                const params = request.parameter;
                let queryString = '';
                for (const key in params) {
                    if (params.hasOwnProperty(key)) {
                        const value = params[key];
                        queryString += `${key}=${value}&`;
                    }
                }
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, (tabs) => {
                    tabCurr = tabs;
                });
                getLocalStorage('wallet', (wallet) => {
                    const checkAddress = !(params.rawTx && params.broadcastOverride)
                    if (wallet !== undefined && (checkAddress ? wallet.accounts[0].address !== params.fromAddress : false)) {
                        windowCallback({
                            return: requestTarget.Send,
                            error: ERRORS.MALFORMED_INPUT,
                            ID: request.ID
                        });
                    } else {
                        chrome.windows.create({
                            ...popupProps,
                            url: `index.html#popup/notification/transfer?${queryString}messageID=${request.ID}`,
                        });
                    }
                });
                return true;
            }
        case requestTarget.Connect:
        case requestTarget.AuthState:
            {
                getStorage('connectedWebsites', (res: any) => {
                    if ((res !== undefined && res[request.hostname] !== undefined) || request.connect === 'true') {
                        if (res !== undefined && res[request.hostname] !== undefined && res[request.hostname].status === 'false') {
                            windowCallback({
                                return: requestTarget.Connect,
                                data: false
                            });
                            return;
                        }
                        windowCallback({
                            return: requestTarget.Connect,
                            data: true
                        });
                    } else {
                        chrome.windows.create({
                            ...popupProps,
                            url: `/index.html#popup/notification/authorization?icon=${request.icon}&hostname=${request.hostname}&title=${request.title}`,
                        });
                    }
                });
                return true;
            }
        case requestTarget.Login: {
            getLocalStorage('shouldLogin', res => {
                if (res === 'false' || res === false) {
                    windowCallback({
                        return: requestTarget.Login,
                        data: true
                    });
                } else {
                    chrome.windows.create({
                        ...popupProps,
                        url: '/index.html#popup/login?notification=true',
                    });
                }
            })
            return true
        }
        case requestTarget.Balance: {
            const parameter = (request.parameter ?? {}) as GetBalanceArgs;
            Promise.all([getNetwork(), parameter.params?.[0].address || getCurrentAddress()] as const)
                .then(([network, address]) => {
                    const err = !address
                        ? 'Could not determine current address'
                        : parameter.params?.length > 1
                            ? 'For now getBalance only supports request for a single address'
                            : null
                    if (err) {
                        windowCallback({
                            return: requestTarget.Balance,
                            error: ERRORS.DEFAULT,
                            ID: request.ID
                        });
                        return;
                    }

                    const requestedContracts = parameter.params?.find(item => item.address === address)?.contracts ?? [];

                    httpGet(balanceURL(network, address), (response: FromBackend<BalanceResponse[]>) => {
                        if(response.status === 'success') {
                            const balances: Balance[] = response.data
                                .map(item => ({
                                    symbol: item.asset.code,
                                    amount: item.amount,
                                    contract: item.asset.hash,
                                }))
                                .filter(item => requestedContracts.length
                                    ? requestedContracts.includes(item.contract)
                                    : true
                                );
                            const returnData: BalanceResults = {
                                [address]: balances,
                            };
                            windowCallback({
                                return: requestTarget.Balance,
                                data: returnData,
                                ID: request.ID,
                                error: null
                            });
                        } else {
                            windowCallback({
                                return: requestTarget.Balance,
                                data: null,
                                ID: request.ID,
                                error: ERRORS.RPC_ERROR
                            });
                        }
                    }, {
                        Network: network.toLowerCase(),
                    });
                });
            return true;
        }
        case requestTarget.InvokeRead: {
            const args = request.parameter[2];
            args.forEach((item, index) => {
                if (item.type === 'Address') {
                    args[index] = {
                        type: 'Hash160',
                        value: getScriptHashFromAddress(item.value)
                    }
                } else if (item.type === 'Boolean') {
                    if (typeof item.value === 'string') {
                        if ((item.value && item.value.toLowerCase()) === 'true') {
                            args[index] = {
                                type: 'Boolean',
                                value: true
                            }
                        } else if (item.value && item.value.toLowerCase() === 'false') {
                            args[index] = {
                                type: 'Boolean',
                                value: false
                            }
                        } else {
                            windowCallback({
                                error: ERRORS.MALFORMED_INPUT,
                                return: requestTarget.InvokeRead,
                                ID: request.ID
                            });
                            window.close();
                        }
                    }
                }
            });
            request.parameter[2] = args;
            const returnRes = { data: {}, ID: request.ID, return: requestTarget.InvokeRead, error: null };
            httpPost(`${request.network}`, {
                jsonrpc: '2.0',
                method: 'invokefunction',
                params: request.parameter,
                id: 3
            }, (res) => {
                res.return = requestTarget.InvokeRead;
                if (!res.error) {
                    returnRes.data = {
                        script: res.result.script,
                        state: res.result.state,
                        gas_consumed: res.result.gas_consumed,
                        stack: res.result.stack
                    };
                } else {
                    returnRes.error = ERRORS.RPC_ERROR;
                }
                windowCallback(returnRes);
            }, null);
            return true;
        }
        case requestTarget.InvokeReadMulti: {
            try {
                const requestData = request.parameter;
                requestData.invokeReadArgs.forEach((invokeReadItem: any, index) => {
                    invokeReadItem.args.forEach((item, itemIndex) => {
                        if (item.type === 'Address') {
                            invokeReadItem.args[itemIndex] = {
                                type: 'Hash160',
                                value: getScriptHashFromAddress(item.value)
                            }
                        } else if (item.type === 'Boolean') {
                            if (typeof item.value === 'string') {
                                if ((item.value && item.value.toLowerCase()) === 'true') {
                                    invokeReadItem.args[itemIndex] = {
                                        type: 'Boolean',
                                        value: true
                                    }
                                } else if (item.value && item.value.toLowerCase() === 'false') {
                                    invokeReadItem.args[itemIndex] = {
                                        type: 'Boolean',
                                        value: false
                                    }
                                } else {
                                    windowCallback({
                                        error: ERRORS.MALFORMED_INPUT,
                                        return: requestTarget.InvokeReadMulti,
                                        ID: request.ID
                                    });
                                    window.close();
                                }
                            }
                        }
                    });
                    requestData.invokeReadArgs[index] = [invokeReadItem.scriptHash,invokeReadItem.operation, invokeReadItem.args];
                })
                const returnRes = { data: [], ID: request.ID, return: requestTarget.InvokeReadMulti, error: null };
                let requestCount = 0;
                requestData.invokeReadArgs.forEach(item => {
                    httpPost(`${request.network}`, {
                        jsonrpc: '2.0',
                        method: 'invokefunction',
                        params: item,
                        id: 3
                    }, (res) => {
                        requestCount ++;
                        if (!res.error) {
                            returnRes.data.push({
                                script: res.result.script,
                                state: res.result.state,
                                gas_consumed: res.result.gas_consumed,
                                stack: res.result.stack
                            });
                        } else {
                            returnRes.error = ERRORS.RPC_ERROR;
                        }
                        if(requestCount === requestData.invokeReadArgs.length) {
                            windowCallback(returnRes);
                        }
                    }, null);
                })
            } catch (error) {
                windowCallback({ data: [], ID: request.ID, return: requestTarget.InvokeReadMulti, error: ERRORS.RPC_ERROR });
            }
            return true;
        }
        case requestTarget.Invoke: {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, (tabs) => {
                tabCurr = tabs;
            });
            const params = request.parameter;
            getStorage('connectedWebsites', (res) => {
                chrome.windows.create({
                    ...popupProps,
                    url: `index.html#popup/notification/invoke?messageID=${request.ID}&tx=${encodeURIComponent(JSON.stringify(params))}`,
                });
            });
            return true;
        }

        case requestTarget.Deploy: {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, (tabs) => {
                tabCurr = tabs;
            });
            const params = request.parameter;
            getStorage('connectedWebsites', (res) => {
                let queryString = '';
                for (const key in params) {
                    if (params.hasOwnProperty(key)) {
                        const value = params[key];
                        queryString += `${key}=${value}&`;
                    }
                }
                chrome.windows.create({
                    ...popupProps,
                    url: `index.html#popup/notification/deploy?${queryString}messageID=${request.ID}`,
                });
            });

            return true;
        }
    }
});

export function windowCallback(data) {
    chrome.tabs.query({}, (tabs) => {
        if (tabs.length > 0) {
            tabs.forEach(item => {
                chrome.tabs.sendMessage(item.id, data);
            })
        }
    });
}

async function getCurrentAddress(): Promise<string | undefined> {
    const wallet = await getLocalStorage('wallet');
    const address = typeof wallet === 'object'
        && 'accounts' in wallet
        && Array.isArray((wallet as { accounts?: unknown; }).accounts)
        && (wallet as { accounts: unknown[]; }).accounts[0]
        && (wallet as { accounts: { address: string; }[]; }).accounts[0].address;
    return address;
}
