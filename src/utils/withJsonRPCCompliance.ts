import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { addJsonRPCCompliance } from '@/shared';

export function httpClientWithJsonRPCCompliance<T extends { get: (url: string, ...rest: any) => Observable<any> }>(client: T): T {
    return {
        ...client,
        get: (...params) => {
            return client.get(...params).pipe(map(addJsonRPCCompliance));
        },
    };
}

export function chromeServiceWithJsonRPCCompliance<T extends { httpGet: (url: string, callback: (res: any) => void) => void }>(client: T): T {
    return {
        ...client,
        httpGet: (url, callback) => {
            return client.httpGet(url, res => callback(addJsonRPCCompliance(res)));
        },
    };
}
