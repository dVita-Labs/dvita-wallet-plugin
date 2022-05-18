import { Observable, from } from 'rxjs';

type Predicate = (url: string) => boolean;
type MockResponse = object;

/**
 * Use some mock responses while OpenAPI is not fully ready
 */
const mocks: [Predicate, MockResponse][] = [
    [
        url => url.includes('/fiat/rates'),
        {
            "last_updated": "2021-09-01 22:58:21",
            "rates": {
                "EUR": 0.84,
                "USD": 1
            }
        },
    ],
    [
        url => url.includes('/coin/rates'),
        {
            "dvg": {
                "price": "0", // if price is 0 fiat won't appear in UI
                "asset_id": "0xb34e1025391e953a918231df11478ec21b039e5f"
            },
            "dvita": {
                "price": "0", // if price is 0 fiat won't appear in UI
                "asset_id": "0xb34e1025391e953a918231df11478ec21b039e5f"
            }
        }
    ],
];

type ClientWithHttpGet = { httpGet: (url: string, ...rest: any) => void };

export function httpClientWithMocks<T extends { get: (url: string, ...rest: any) => Observable<any> }>(client: T): T {
    return {
        ...client,
        get: (...params) => getMock(params[0]) || client.get(...params),
    };
}

export function chromeServiecWithMocks<T extends { httpGet: (url: string, ...rest: any) => void }>(client: T): T {
    return {
        ...client,
        httpGet: (...params) => getMock(params[0]) || client.httpGet(...params),
    };
}

function getMock(url: string) {
    for (const mock of mocks) {
        if (mock[0](url)) {
            console.log(`Returning mocked response for ${url}`);
            return from(Promise.resolve(mock[1]));
        }
    }
}
