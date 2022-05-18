/// <reference types="chrome"/>
import { Network, validNetwork, addJsonRPCCompliance } from '../shared';

export function httpGet(url, callback, headers) {
    fetch(url, { headers: headers || {} })
        .then(resp => {
            if (!resp.ok) {
                throw new Error(`Failed to fetch: ${resp.status} ${resp.statusText}`)
            }
            return resp.json()
        })
        .then(json => callback(addJsonRPCCompliance(json)));
}

export function httpPost(url, data, callback, headers) {
    fetch(url, {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            ...headers,
        },
        method: 'POST',
        body: JSON.stringify(data),
    })
        .then(resp => {
            if (!resp.ok) {
                throw new Error(`Failed to post: ${resp.status} ${resp.statusText}`)
            }
            return resp.json()
        })
        .then(json => callback(addJsonRPCCompliance(json)));
}

export function getStorage(key: string, callback: (result: any) => void) {
    chrome.storage.sync.get([key], (result) => {
        callback(result[key]);
    });
}

export function setStorage(value) {
    chrome.storage.sync.set(value, () => {
        console.log('Set storage', value);
    });
}
export function removeStorage(key) {
    chrome.storage.sync.remove(key);
}

export function clearStorage() {
    chrome.storage.sync.clear();
}

export function getLocalStorage(key: string, callback: (result: any) => void = () => { }): Promise<any> {
    return new Promise(resolve => {
        chrome.storage.local.get([key], (result) => {
            callback(result[key]);
            resolve(result[key]);
        });
    });
}

export function setLocalStorage(value) {
    chrome.storage.local.set(value, () => {
        console.log('Set local storage', value);
    });
}
export function removeLocalStorage(key) {
    chrome.storage.local.remove(key);
}

export function clearLocalStorage() {
    chrome.storage.local.clear();
}

function getUseAgent() {
    const defaultAgent = navigator.userAgent;
    const agentArr = defaultAgent.split(' ');
    let res = '';
    agentArr.forEach(item => {
        if(item.match('Chrome') !== null) {
            res += item;
        }
    })
    res += ` AppVersion/${chrome.runtime.getManifest().version ? chrome.runtime.getManifest().version : 'debug'}`;
    return res;
}

export async function getNetwork(): Promise<Network> {
    const networkInStorage = await new Promise(resolve => getStorage('net', resolve));
    return validNetwork(networkInStorage);
}
