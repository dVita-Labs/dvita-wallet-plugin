/// <reference types="chrome"/>
import {
    Injectable
} from '@angular/core';
import {
    Observable,
    of,
    throwError,
    from,
    Subject
} from 'rxjs';
import {
    WalletJSON
} from '@cityofzion/neon-core/lib/wallet';
import { Balance } from '@/models/models';
import { EVENT } from '@/models/dapi';
import { Language, languages, getValidLanguage } from '@/utils/language';
import { loschmidtDependencies } from 'mathjs';
import { stat } from 'fs';
import { ChainType } from '@/app/popup/_lib';
import { Network, validNetwork, addJsonRPCCompliance } from '@/shared';

interface ChromeAPI {
    setStorage: typeof chrome.storage.sync.set;
    getStorage: (key: string, callback: (result: any) => void) => void;
    removeStorage: typeof chrome.storage.sync.remove;
    clearStorage: typeof chrome.storage.sync.clear;
    getLocalStorage: (key: string, callback: (result: any) => void) => Promise<any>;
    setLocalStorage: typeof chrome.storage.sync.set;
    removeLocalStorage: typeof chrome.storage.local.remove;
    clearLocalStorage: typeof chrome.storage.local.clear;
    windowCallback: (data: any) => Promise<void>;
    httpGet: (url: any, callback: any, headers: any) => void; // TODO fix types and check if fetch api can be used
    httpGetImage: (url: any, callback: any, headers: any) => void; // TODO fix types and check if fetch api can be used
    httpPost: (url: any, data: any, callback: any, headers: any) => void; // TODO fix types and check if fetch api can be used
    version: string;
}

@Injectable()
export class ChromeService {
    // private crx: null | typeof import("../../../../extension/background/index") = null;
    private crx: null | ChromeAPI = null;
    private net: Network = 'MainNet';
    private haveBackupTip = true; // true means show backup tip
    constructor() {
        try {
            const crx: ChromeAPI = {
                version: chrome.runtime.getManifest().version,
                setStorage: chrome.storage.sync.set.bind(chrome.storage.sync),
                getLocalStorage: (key: string, callback: (result: any) => void = () => { }): Promise<any> => {
                    return new Promise(resolve => {
                        chrome.storage.local.get([key], (result) => {
                            callback(result[key]);
                            resolve(result[key]);
                        });
                    });
                },
                getStorage(key: string, callback: (result: any) => void) {
                    chrome.storage.sync.get([key], (result) => {
                        callback(result[key]);
                    });
                },
                setLocalStorage: chrome.storage.local.set.bind(chrome.storage.local),
                clearStorage: chrome.storage.sync.clear.bind(chrome.storage.sync),
                clearLocalStorage: chrome.storage.local.clear.bind(chrome.storage.local),
                removeStorage: chrome.storage.sync.remove.bind(chrome.storage.sync),
                removeLocalStorage: chrome.storage.local.remove.bind(chrome.storage.local),
                windowCallback: (data) => {
                    return new Promise<void>(resolve => {
                        chrome.tabs.query({}, (tabs) => {
                            if (tabs.length > 0) {
                                tabs.forEach(item => {
                                    chrome.tabs.sendMessage(item.id, data);
                                });
                                resolve();
                            }
                        });
                    });
                },
                httpGet: (url, callback, headers) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', url, true);
                    if (headers) {
                        for (const key in headers) {
                            if (key !== undefined) {
                                xhr.setRequestHeader(key, headers[key]);
                            }
                        }
                    }
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4) {
                            // JSON.parse does not evaluate the attacker's scripts.
                            try {
                                const resp = JSON.parse(xhr.responseText);
                                callback(addJsonRPCCompliance(resp));
                            } catch (e) {
                                callback('parse failed');
                            }
                        }
                    };
                    xhr.send();
                },
                httpGetImage: (url, callback, headers) => {
                    const xhr = new XMLHttpRequest();
                    xhr.responseType = 'blob';
                    xhr.open('GET', url, true);
                    if (headers) {
                        for (const key in headers) {
                            if (key) {
                                xhr.setRequestHeader(key, headers[key]);
                            }
                        }
                    }
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4) {
                            try {
                                callback(xhr);
                            } catch (e) {
                                callback('request failed');
                            }
                        }
                    };
                    xhr.send();
                },
                httpPost: (url, data, callback, headers) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', url, true);
                    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
                    if (headers) {
                        for (const key in headers) {
                            if (key !== undefined) {
                                xhr.setRequestHeader(key, headers[key]);
                            }
                        }
                    }
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4) {
                            // JSON.parse does not evaluate the attacker's scripts.
                            try {
                                const resp = JSON.parse(xhr.responseText);
                                callback(resp);
                            } catch (e) {
                                callback('parse failed');
                            }
                        }
                    };
                    xhr.send(JSON.stringify(data));
                }
            };
            this.crx = crx;
            this.crx.getLocalStorage('haveBackupTip', result => {
                this.haveBackupTip = result === 'false' ? false : true; // default to true (to show backup tip)
            });
        } catch (e) {
            this.crx = null;
            // default to true (to show backup tip)
            this.haveBackupTip = sessionStorage.getItem('haveBackupTip') === 'false' ? false : true;
        }
    }


    /**
     * check is in chrome extension env
     * Check if you are in the crx environment
     */
    public get check(): boolean {
        return !!this.crx;
    }

    public getVersion(): string {
        if (this.check) {
            return this.crx.version;
        } else {
            return '';
        }
    }

    /**
     * Get saved account from storage.
     * Get current wallet from storage
     */
    public getWallet(): Observable<WalletJSON> {
        if (!this.check) {
            try {
                return of(JSON.parse(localStorage.getItem('wallet')));
            } catch (e) {
                return throwError('please set wallet json to local storage when debug mode on');
            }
        }
        return from(new Promise<WalletJSON>((resolve, reject) => {
            try {
                this.crx.getLocalStorage('wallet', (res) => {
                    resolve(res);
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }
    public getWalletArray(chainType: ChainType): Observable<Array<any>> {
        let storageName = `walletArr-${chainType}`;
        if (chainType === 'Neo2') {
            storageName = 'walletArr';
        }
        if (!this.check) {
            try {
                return of(JSON.parse(localStorage.getItem(storageName)));
            } catch (e) {
                return throwError('please set wallet json to local storage when debug mode on');
            }
        }
        return from(new Promise<Array<WalletJSON>>((resolve, reject) => {
            try {
                this.crx.getLocalStorage(storageName, (res) => {
                    resolve(res);
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }
    public getWIFArray(chainType: ChainType): Observable<Array<string>> {
        let storageName = `WIFArr-${chainType}`;
        if (chainType === 'Neo2') {
            storageName = 'WIFArr';
        }
        if (!this.check) {
            try {
                return of(JSON.parse(localStorage.getItem(storageName)));
            } catch (e) {
                return throwError('please set wif json to local storage when debug mode on');
            }
        }
        return from(new Promise<Array<string>>((resolve, reject) => {
            try {
                this.crx.getLocalStorage(storageName, (res) => {
                    resolve(res);
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }

    /**
     * Set wallet as active account, and add to history list.
     * Save the current wallet and record it in history
     */
    public setWallet(w: any) {
        if (!this.check) {
            localStorage.setItem('wallet', JSON.stringify(w));
            return;
        }
        try {
            this.crx.setLocalStorage({
                wallet: w
            });
        } catch (e) {
            console.log('set account failed', e);
        }
    }
    /**
     * Set wallets, and add to history list.
     * Save the wallet array and record it in history
     */
    public setWalletArray(w: Array<any>, chainType: ChainType) {
        let storageName = `walletArr-${chainType}`;
        if (chainType === 'Neo2') {
            storageName = 'walletArr';
        }
        if (!this.check) {
            localStorage.setItem(storageName, JSON.stringify(w));
            return;
        }
        try {
            const saveData = {};
            saveData[storageName] = w;
            this.crx.setLocalStorage(saveData);
        } catch (e) {
            console.log('set account failed', e);
        }
    }

    /**
     * Set wallets, and add to history list.
     * Save the wif array and record it in history
     */
    public setWIFArray(WIFArr: Array<string>, chainType: ChainType) {
        let storageName = `WIFArr-${chainType}`;
        if (chainType === 'Neo2') {
            storageName = 'WIFArr';
        }
        if (!this.check) {
            localStorage.setItem(storageName, JSON.stringify(WIFArr));
            return;
        }
        try {
            const saveData = {};
            saveData[storageName] = WIFArr;
            this.crx.setLocalStorage(saveData);
        } catch (e) {
            console.log('set account failed', e);
        }
    }

    public getUpdateNeo3AddressFlag(): Observable<any> {
        if (!this.check) {
            try {
                return of(JSON.parse(localStorage.getItem('neo3AddressFlag')));
            } catch (e) {
                return throwError('please set neo3AddressFlag json to local storage when debug mode on');
            }
        }
        return from(new Promise<WalletJSON>((resolve, reject) => {
            try {
                this.crx.getLocalStorage('neo3AddressFlag', (res) => {
                    resolve(res);
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }

    public setUpdateNeo3AddressFlag(flag: boolean) {
        let storageName = `neo3AddressFlag`;

        if (!this.check) {
            localStorage.setItem(storageName, JSON.stringify(flag));
            return;
        }
        try {
            const saveData = {};
            saveData[storageName] = flag;
            this.crx.setLocalStorage(saveData);
        } catch (e) {
            console.log('set account failed', e);
        }
    }

    /**
     * Close opened wallet, remove from storage
     * Clear the currently open wallet
     */
    public closeWallet() {
        if (!this.check) {
            localStorage.removeItem('wallet');
            return;
        }
        try {
            this.crx.removeLocalStorage('wallet');
        } catch (e) {
            console.log('close wallet failed', e);
        }
    }
    public clearLogin() {
        if (!this.check) {
            localStorage.setItem('shouldLogin', 'true');
            return;
        }
        try {
            this.crx.setLocalStorage({
                shouldLogin: true
            });
        } catch (e) {
            console.log('clear login failed', e);
        }
    }
    public verifyLogin() {
        if (!this.check) {
            localStorage.setItem('shouldLogin', 'false');
            return;
        }
        try {
            this.crx.setLocalStorage({
                shouldLogin: false
            });
        } catch (e) {
            console.log('verify login', e);
        }
    }
    public getLogin(): Observable<boolean> {
        if (!this.check) {
            return from(new Promise<boolean>(resolve => {
                resolve(localStorage.getItem('shouldLogin') === 'true');
            }));
        }
        return from(new Promise<boolean>((resolve, reject) => {
            try {
                this.crx.getLocalStorage('shouldLogin', (res) => {
                    switch (res) {
                        case true:
                        case false:
                            break;
                        default:
                            res = false;
                    }
                    resolve(res);
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }
    public setLogin(status: string) {
        if (!this.check) {
            localStorage.setItem('shouldLogin', status);
        } else {
            return from(new Promise((resolve, reject) => {
                try {
                    this.crx.setLocalStorage({ shouldLogin: status });
                } catch (e) {
                    reject('failed');
                }
            }));
        }
    }
    public setLang(lang: Language) {
        if (!this.check) {
            localStorage.setItem('lang', lang);
            return;
        }
        try {
            this.crx.setStorage({
                lang
            });
        } catch (e) {
            console.log('set lang failed', e);
        }
    }
    public getLang(): Observable<Language> {
        if (!this.check) {
            try {
                return of(getValidLanguage(localStorage.getItem('lang')));
            } catch (e) {
                return throwError('please get lang to local storage when debug mode on');
            }
        }
        return from(new Promise<Language>((resolve, reject) => {
            try {
                this.crx.getStorage('lang', (res) => {
                    resolve(getValidLanguage(res));
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }
    public getWatch(address: string, chainType: ChainType): Observable<Balance[]> {
        const storageName = `watch_${this.net.toLowerCase()}-${chainType}`;
        if (!this.check) {
            try {
                let rs = (JSON.parse(localStorage.getItem(storageName))|| {})[address] || [];
                if (!Array.isArray(rs)) {
                    rs = [];
                }
                return of(rs);
            } catch (e) {
                return throwError('please set watch to local storage when debug mode on');
            }
        } else {
            return from(new Promise<Balance[]>((resolve, reject) => {
                try {
                    this.crx.getLocalStorage(storageName, (res) => {
                        res = (res || {})[address] || [];
                        if (!Array.isArray(res)) {
                            res = [];
                        }
                        resolve(res);
                    });
                } catch (e) {
                    reject('failed');
                }
            }));
        }
    }
    public getAllWatch(chainType: ChainType): Observable<object> {
        const storageName = `watch_${this.net.toLowerCase()}-${chainType}`;
        if (!this.check) {
            try {
                const rs = JSON.parse(localStorage.getItem(storageName))|| {};
                return of(rs);
            } catch (e) {
                return throwError('please set watch to local storage when debug mode on');
            }
        } else {
            return from(new Promise<Balance[]>((resolve, reject) => {
                try {
                    this.crx.getLocalStorage(storageName, (res) => {
                        res = res || {};
                        resolve(res);
                    });
                } catch (e) {
                    reject('failed');
                }
            }));
        }
    }
    public setWatch(address: string, watch: Balance[], chainType: ChainType) {
        const storageName = `watch_${this.net.toLowerCase()}-${chainType}`;
        this.getAllWatch(chainType).subscribe(watchObject => {
            const saveWatch = watchObject || {};
            saveWatch[address] = watch;
            if (!this.check) {
                localStorage.setItem(storageName, JSON.stringify(saveWatch));
                return;
            }
            try {
                const saveData = {};
                saveData[storageName]= saveWatch;
                this.crx.setLocalStorage(saveData);
            } catch (e) {
                console.log('set watch failed', e);
            }
        })
    }
    public setTransaction(transaction: object) {
        if (!this.check) {
            localStorage.setItem('transaction', JSON.stringify(transaction));
            return;
        }
        try {
            this.crx.setStorage({
                transaction
            });
        } catch (e) {
            console.log('set account failed', e);
        }
    }
    public getTransaction(): Observable<object> {
        if (!this.check) {
            try {
                if (localStorage.getItem('transaction') == null) {
                    return of({});
                }
                return of(JSON.parse(localStorage.getItem('transaction')));
            } catch (e) {
                return throwError('please get transaction json to local storage when debug mode on');
            }
        }
        return from(new Promise<object>((resolve, reject) => {
            try {
                this.crx.getStorage('transaction', (res) => {
                    if (typeof res === 'undefined') {
                        res = {};
                    }
                    resolve(res);
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }
    public setAuthorization(websits: object) {
        if (!this.check) {
            localStorage.setItem('connectedWebsites', JSON.stringify(websits));
            return;
        }
        try {
            this.crx.setStorage({
                connectedWebsites: websits
            });
        } catch (e) {
            console.log('set account failed', e);
        }
    }

    public getAuthorization(): Observable<object> {
        if (!this.check) {
            try {
                if (localStorage.getItem('connectedWebsites') == null) {
                    return of({});
                }
                return of(JSON.parse(localStorage.getItem('connectedWebsites')));
            } catch (e) {
                return throwError(('failed'));
            }
        }
        return from(new Promise<object>((resolve, reject) => {
            try {
                this.crx.getStorage('connectedWebsites', (res) => {
                    if (typeof res === 'undefined') {
                        res = {};
                    }
                    resolve(res);
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }

    public setRateCurrency(rateCurrency: string) {
        if (!this.check) {
            localStorage.setItem('rateCurrency', rateCurrency);
            return;
        }
        try {
            this.crx.setStorage({
                rateCurrency
            });
        } catch (e) {
            console.log('set current rate currency failed', e);
        }
    }

    public getRateCurrency(): Observable<string> {
        const defaultCurrency = 'EUR';
        if (!this.check) {
            try {
                return of(localStorage.getItem('rateCurrency') || defaultCurrency);
            } catch (e) {
                return throwError(('failed'));
            }
        }
        return from(new Promise<string>((resolve, reject) => {
            try {
                this.crx.getStorage('rateCurrency', (res) => {
                    if (typeof res === 'undefined') {
                        res = defaultCurrency;
                    }
                    resolve(res);
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }

    public setAssetFile(assetFile: Map<string, {}>) {
        if (!this.check) {
            localStorage.setItem('assetFile', JSON.stringify(Array.from(assetFile.entries())));
            return;
        }
        try {
            this.crx.setLocalStorage({
                assetFile: JSON.stringify(Array.from(assetFile.entries()))
            });
        } catch (e) {
            console.log('set assetFile failed', e);
        }
    }
    public getAssetFile(): Observable<Map<string, { 'last-modified'?: string; 'image-src': string; }>> {
        if (!this.check) {
            try {
                return of(new Map(JSON.parse(localStorage.getItem('assetFile'))));
            } catch (e) {
                return throwError('please get history json to local storage when debug mode on');
            }
        }
        return from(new Promise<Map<string, { 'last-modified'?: string; 'image-src': string; }>>((resolve, reject) => {
            try {
                this.crx.getLocalStorage('assetFile', (res) => {
                    if (res) {
                        resolve(new Map(JSON.parse(res)));
                    } else {
                        resolve(new Map());
                    }
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }

    public setAssetEURRate(assetEURRate: Map<string, {}>) {
        if (!this.check) {
            localStorage.setItem('assetEURRate', JSON.stringify(Array.from(assetEURRate.entries())));
            return;
        }
        try {
            this.crx.setStorage({
                assetEURRate: JSON.stringify(Array.from(assetEURRate.entries()))
            });
        } catch (e) {
            console.log('set assetEURRate failed', e);
        }
    }
    public getAssetEURRate(): Observable<Map<string, {}>> {
        if (!this.check) {
            try {
                return of(new Map(JSON.parse(localStorage.getItem('assetEURRate'))));
            } catch (e) {
                return throwError('please get history json to local storage when debug mode on');
            }
        }
        return from(new Promise<Map<string, {}>>((resolve, reject) => {
            try {
                this.crx.getStorage('assetEURRate', (res) => {
                    if (res) {
                        resolve(new Map(JSON.parse(res)));
                    } else {
                        resolve(new Map());
                    }
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }

    public setAssetUSDRate(assetUSDRate: Map<string, {}>) {
        if (!this.check) {
            localStorage.setItem('assetUSDRate', JSON.stringify(Array.from(assetUSDRate.entries())));
            return;
        }
        try {
            this.crx.setStorage({
                assetUSDRate: JSON.stringify(Array.from(assetUSDRate.entries()))
            });
        } catch (e) {
            console.log('set assetUSDRate failed', e);
        }
    }
    public getAssetUSDRate(): Observable<Map<string, {}>> {
        if (!this.check) {
            try {
                return of(new Map(JSON.parse(localStorage.getItem('assetUSDRate'))));
            } catch (e) {
                return throwError('please get history json to local storage when debug mode on');
            }
        }
        return from(new Promise<Map<string, {}>>((resolve, reject) => {
            try {
                this.crx.getStorage('assetUSDRate', (res) => {
                    if (res) {
                        resolve(new Map(JSON.parse(res)));
                    } else {
                        resolve(new Map());
                    }
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }

    public clearAssetFile() {
        if (!this.check) {
            localStorage.removeItem('assetFile');
            localStorage.removeItem('assetEURRate');
            localStorage.removeItem('assetUSDRate');
        } else {
            this.crx.removeLocalStorage('assetFile');
            this.crx.removeStorage('assetEURRate');
            this.crx.removeStorage('assetUSDRate');
        }
    }

    public setNet(net: Network) {
        this.net = net;
        if (!this.check) {
            localStorage.setItem('net', JSON.stringify(net));
            return;
        }
        try {
            this.crx.setStorage({
                net
            });
            this.windowCallback({
                return: EVENT.NETWORK_CHANGED,
                data: {
                    networks: ['MainNet', 'TestNet'],
                    defaultNetwork: net === 'TestNet' ? 'TestNet' : 'MainNet'
                }
            });
        } catch (e) {
            console.log('set net failed', e);
        }
    }
    public getNet(): Observable<Network> {
        if (!this.check) {
            try {
                if (localStorage.getItem('net')) {
                    this.net = JSON.parse(localStorage.getItem('net'))
                    return of(validNetwork(JSON.parse(localStorage.getItem('net'))));
                } else {
                    return of('TestNet'); // Default network
                }
            } catch (e) {
                return throwError('please get net json to local storage when debug mode on');
            }
        }
        return from(new Promise<Network>((resolve, reject) => {
            try {
                this.crx.getStorage('net', (res) => {
                    this.net = validNetwork(res);
                    resolve(this.net);
                });
            } catch (e) {
                reject('failed');
            }
        }));
    }
    public clearStorage() {
        if (!this.check) {
            localStorage.clear();
        }
        try {
            this.crx.clearStorage();
            this.crx.clearLocalStorage();
        } catch (e) {
            console.log('close wallet failed', e);
        }
    }

    public resetWallet() {
        if (!this.check) {
            localStorage.setItem('shouldLogin', 'false');
        } else {
            this.crx.setLocalStorage({ setLocalStorage: false });
        }
        this.setWIFArray([], 'Neo2');
        this.setWIFArray([], 'Neo3');
        this.setWalletArray([], 'Neo2');
        this.setWalletArray([], 'Neo3');
        this.setWallet(undefined);
    }

    public getHaveBackupTip() {
        return this.haveBackupTip;
    }

    public setHaveBackupTip(status?: boolean) {
        const setValue = status === null
        if (status === null) {
            if (!this.check) {
                sessionStorage.removeItem('haveBackupTip');
            } else {
                this.crx.removeLocalStorage('haveBackupTip');
                this.haveBackupTip = false;
            }
        } else {
            if (!this.check) {
                sessionStorage.setItem('haveBackupTip', status.toString());
            } else {
                this.crx.setLocalStorage({ haveBackupTip: status.toString() });
                this.haveBackupTip = status;
            }
        }
    }

    public setWalletsStatus(address: string) {
        let walletsIsBackup = {};
        if (!this.check) {
            walletsIsBackup = JSON.parse(localStorage.getItem('walletsStatus')) || {};
            walletsIsBackup[address] = true;
            localStorage.setItem('walletsStatus', JSON.stringify(walletsIsBackup));
        } else {
            this.crx.getLocalStorage('walletsStatus', (res) => {
                if (res) {
                    walletsIsBackup = res || {};
                } else {
                    walletsIsBackup = {};
                }
                walletsIsBackup[address] = true;
                this.crx.setLocalStorage({
                    walletsStatus: walletsIsBackup
                });
            });
        }
    }

    public getWalletStatus(address: string): Observable<boolean> {
        let walletsIsBackup = {};
        if (!this.check) {
            try {
                walletsIsBackup = JSON.parse(localStorage.getItem('walletsStatus'));
                return of(walletsIsBackup[address] || false);
            } catch (e) {
                return of(false);
            }
        }
        return from(new Promise<boolean>((resolve, reject) => {
            try {
                this.crx.getLocalStorage('walletsStatus', (res) => {
                    resolve((res && res[address]) || false);
                });
            } catch (e) {
                resolve(false);
            }
        }));
    }

    public getLocalStorage(key): Promise<any> {
        return this.crx.getLocalStorage(key, (res) => {
            return res;
        });
    }


    public setLocalStorage(data) {
        this.crx.setLocalStorage(data);
    }

    public windowCallback(data: any) {
        if (this.check) {
            return this.crx.windowCallback(data);
        } else {
            return Promise.resolve();
        }
    }

    public httpGet(url: string, callback: (arg0: any) => void, headers: object = null) {
        try {
            this.crx.httpGet(url, callback, headers);
        } catch (e) {
            console.log('not in crx env');
        }
    }

    public httpGetImage(url: string, callback: (arg0: any) => void, headers: object = null) {
        try {
            this.crx.httpGetImage(url, callback, headers);
        } catch (e) {
            console.log('not in crx env');
        }
    }

    public httpPost(url: string, data: any, callback: (arg0: any) => void, headers: object = null) {
        try {
            this.crx.httpPost(url, data, callback, headers);
        } catch (e) {
            console.log('not in crx env');
        }
    }
}
