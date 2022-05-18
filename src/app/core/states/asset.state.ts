import { Injectable, SecurityContext } from '@angular/core';
import { HttpService } from '../services/http.service';
import { GlobalService } from '../services/global.service';
import { ChromeService } from '../services/chrome.service';
import { Observable, Subject, from, of, forkJoin } from 'rxjs';
import { Balance, Nep5Detail } from 'src/models/models';
import { map, switchMap, refCount, publish, filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { FeeSpeed } from '@popup/_lib/type';
import { bignumber } from 'mathjs';
import { rpc } from '@cityofzion/neon-core';
import { NeonService } from '../services/neon.service';
import { DVITA_TOKEN, DVG_TOKEN } from '@popup/_lib';
import { BalanceResponse, allAssets, balance, asset as fetchAsset } from '@/shared';
import { generateImage } from '@/utils/generateImage';

const predefinedAssetImages = {
    DVITA: '/assets/images/token_dvita.png',
    DVG: '/assets/images/token_dvg.png',
};

@Injectable()
export class AssetState {
    public assetFile: Map<string, { 'last-modified'?: string; 'image-src': string } | undefined> = new Map();
    public $webAddAssetId: Subject<Balance> = new Subject();
    public $webDelAssetId: Subject<string> = new Subject();
    public assetRate: Map<string, {}> = new Map();
    public rateCurrency: string;

    public balanceSource = new Subject<Balance[]>();
    public balanceSub$ = this.balanceSource.asObservable();
    public gasFeeSpeed: FeeSpeed;
    public neo3GasFeeSpeed: FeeSpeed;
    public gasFeeDefaultSpeed: FeeSpeed = {
        slow_price: '0',
        propose_price: '0.011',
        fast_price: '0.2',
    };

    constructor(
        private http: HttpService,
        private global: GlobalService,
        private chrome: ChromeService,
        private httpClient: HttpClient,
        private neonService: NeonService,
    ) {
        this.chrome.getAssetFile().subscribe((res) => {
            this.assetFile = res;
        });
        this.chrome.getRateCurrency().subscribe((res) => {
            this.rateCurrency = res;
            this.changeRateCurrency(res);
        });
    }

    public pushBalance(balance: Balance[]) {
        this.balanceSource.next(balance);
    }
    public changeRateCurrency(currency) {
        this.rateCurrency = currency;
        if (currency === 'EUR') {
            this.chrome.getAssetEURRate().subscribe((res) => {
                this.assetRate = res;
            });
        } else {
            this.chrome.getAssetUSDRate().subscribe((res) => {
                this.assetRate = res;
            });
        }
    }

    public pushDelAssetId(id) {
        this.$webDelAssetId.next(id);
    }

    public popDelAssetId(): Observable<any> {
        return this.$webDelAssetId.pipe(publish(), refCount());
    }

    public pushAddAssetId(id) {
        this.$webAddAssetId.next(id);
    }

    public popAddAssetId(): Observable<any> {
        return this.$webAddAssetId.pipe(publish(), refCount());
    }

    public clearCache() {
        this.assetFile = new Map();
        this.assetRate = new Map();
    }

    public detail(address: string, id: string): Observable<Balance> {
        return this.fetchBalance(address).pipe(
            switchMap((balance) =>
                this.chrome
                    .getWatch(address, this.neonService.currentWalletChainType)
                    .pipe(
                        map((watching) => {
                            return (
                                balance.find((e) => e.asset_id === id) ||
                                watching.find((w) => w.asset_id === id)
                            );
                        })
                    )
            )
        );
    }

    public getAssetImageFromUrl(rawUrl: string, lastModified: string) {
        return this.http.getImage(rawUrl, lastModified);
    }

    public setAssetFile(res: XMLHttpRequest, assetId: string): Promise<any> {
        const temp = {
            'last-modified': res.getResponseHeader('Last-Modified'),
        };
        return new Promise((resolve, reject) => {
            const a = new FileReader();
            a.readAsDataURL(res.response); // Read the file and save it in the result
            a.onload = (e: any) => {
                const getRes = e.target.result; // The result of reading is in result
                this.assetFile.set(assetId, { ...temp, 'image-src': getRes });
                this.chrome.setAssetFile(this.assetFile);
                resolve(getRes);
            };
        });
    }
    public getRate(): Observable<any> {
        return this.http.get(
            `${this.global.apiDomain}/v1/coin/rates?chain=neo`
        );
    }

    public getFiatRate(): Observable<any> {
        return this.http.get(`${this.global.apiDomain}/v1/fiat/rates`);
    }

    public getAssetRate(coins: string): Observable<any> {
        if (!coins) {
            return of({});
        }
        coins = coins.toLowerCase();
        const coinsAry = coins.split(',');
        const rateRes = {};
        let targetCoins = '';
        coinsAry.forEach((element) => {
            const tempAssetRate = this.assetRate.get(element);
            if (tempAssetRate && tempAssetRate['last-modified']) {
                rateRes[element] = tempAssetRate['rate'];
                if (
                    new Date().getTime() / 1000 -
                        tempAssetRate['last-modified'] >
                    1200
                ) {
                    targetCoins += element + ',';
                }
            } else {
                targetCoins += element + ',';
            }
        });
        targetCoins = targetCoins.slice(0, -1);
        if (targetCoins === '') {
            return of(rateRes);
        }
        return forkJoin([this.getRate(), this.getFiatRate()]).pipe(
            map((result) => {
                const rateBalance = result[0];
                const fiatData = result[1];
                const targetCoinsAry = targetCoins.split(',');
                targetCoinsAry.forEach((coin) => {
                    const tempRate = {};
                    tempRate['last-modified'] = rateBalance['response_time'];
                    if (coin in rateBalance) {
                        tempRate['rate'] = bignumber(
                            rateBalance[coin].price || 0
                        )
                            .mul(
                                bignumber(
                                    fiatData.rates &&
                                        fiatData.rates[
                                            this.rateCurrency.toUpperCase()
                                        ]
                                ) || 0
                            )
                            .toFixed();
                        rateRes[coin] = tempRate['rate'];
                    } else {
                        tempRate['rate'] = '0';
                        rateRes[coin] = '0';
                    }
                    this.assetRate.set(coin, tempRate);
                });
                if (this.rateCurrency === 'EUR') {
                    this.chrome.setAssetEURRate(this.assetRate);
                } else {
                    this.chrome.setAssetUSDRate(this.assetRate);
                }
                return rateRes;
            })
        );
    }

    public defaultAssetSrc(symbol: string) {
        return predefinedAssetImages[symbol] || generateImage(symbol);
    }

    /**
     * This function has a side-effect of fetching image_url and storing it via `setAssetFile`
     */
    public getAssetImage(asset: Pick<Balance, 'asset_id' | 'symbol'> & { image_url?: Balance['image_url'] }): string {
        const imageObj = this.assetFile.get(asset.asset_id);
        let lastModified = '';
        if (imageObj) {
            lastModified = imageObj['last-modified'];
            return imageObj['image-src'];
        }

        if (asset.image_url) {
            this.getAssetImageFromUrl(asset.image_url, '').toPromise()
                .then(assetRes => {
                    if (assetRes && assetRes.status === 200) {
                        return this.setAssetFile(assetRes, asset.asset_id);
                    }
                });
        }

        return asset.image_url || this.defaultAssetSrc(asset.symbol);
    }

    public async getMoney(symbol: string, balance: number): Promise<string> {
        let rate: any;
        try {
            rate = await this.getAssetRate(symbol).toPromise();
        } catch (error) {
            rate = {};
        }
        if (symbol.toLowerCase() in rate) {
            return this.global
                .mathmul(Number(rate[symbol.toLowerCase()]), Number(balance))
                .toString();
        } else {
            return '0';
        }
    }

    //#region neo3
    /**
     * Format neo3 interface to return data, field name contract => asset_id
     * @param data Interface data
     */
    formatResponseData(data: any[]) {
        return data && data.map((item) => {
            item.asset_id = item.contract;
            if (item.contract === DVITA_TOKEN) {
                item.symbol = 'DVITA';
            }
            if (item.contract === DVG_TOKEN) {
                item.symbol = 'DVG';
            }
            return item;
        });
    }

    /**
     * If assetHash is defined, fetches balance for that asset
     * If assetHash is undefined, fetches balance for all well-known assets
     * @param address address
     */
    public fetchBalance(address: string, assetHash?: string) {
        return from(balance(this.global.net, address, assetHash))
            .pipe(
                map((res): Balance[] => res.map(balance => ({
                    asset_id: balance.asset.hash,
                    balance: bignumber(balance.amount).div(bignumber(10).pow(balance.asset.decimals)).toString(),
                    name: balance.asset.name,
                    symbol: balance.asset.code,
                    decimals: Number(balance.asset.decimals),
                    watching: true,
                    image_url: balance.asset.metadata?.icon || undefined,
                    avatar: balance.asset.metadata?.icon || undefined,
                    rateBalance: 0,
                })))
            );
    }

    /**
     * Get recommended assets
     */
    public fetchAllowList(): Observable<Balance[]> {
        return from(
            allAssets(this.global.net)
                .then((assets): AllowListAsset[] => {
                    return assets.map(asset => ({
                        "id": 1, // TODO what is this?
                        "contract": asset.hash,
                        "name": asset.name || asset.hash.slice(-3),
                        "symbol": asset.code || asset.hash.slice(-3),
                    }))
                })
                .then(allowListAssets => this.formatResponseData(allowListAssets))
        );
    }

    /**
     * Fuzzy search asset information
     * @param query Search Information
     */
    public searchAsset(query: string) {
        const assets = this.fetchAllowList().toPromise()
            .then(assets => {
                const userEnteredTokenHash = query.replace(/^0x/, '').length === 40; // TODO do proper verification using neon-js
                const filtered = assets.filter(asset => {
                    return `${asset.asset_id}${asset.name}${asset.symbol}`.toLowerCase().includes(query.toLowerCase());
                });
                if (!filtered.length && userEnteredTokenHash) {
                    const hash = '0x' + query.replace(/^0x/, '');
                    return fetchAsset(this.global.net, hash).then(asset => this.formatResponseData([{
                        ...asset,
                        contract: asset.hash,
                        name: asset.name || asset.hash.slice(-3),
                        symbol: asset.code || asset.hash.slice(-3),
                    }]));
                }
            });
        return from(assets);
    }

    public getGasFee(): Observable<any> {
        const mockResponse: GasFeeResponse = {
            fast_price: '200',
            propose_price: '110',
            slow_price: '100',
        };
        console.warn('Responding to getGasFee with mocked response');
        return from(Promise.resolve(mockResponse)).pipe(
            map((res: any) => {
                res.slow_price = bignumber(res.slow_price).dividedBy(bignumber(10).pow(8)).toFixed();
                res.propose_price = bignumber(res.propose_price).dividedBy(bignumber(10).pow(8)).toFixed();
                res.fast_price = bignumber(res.fast_price).dividedBy(bignumber(10).pow(8)).toFixed();
                this.neo3GasFeeSpeed = res || this.gasFeeDefaultSpeed;
                return res || this.gasFeeDefaultSpeed;
            })
        );
    }

    /**
     * Get asset details
     * @param assetId assetsid
     */
    public getNep5Detail(assetId: string): Observable<{ symbol: string }> {
        console.warn('Responding to getGasFee with mocked response');
        return from(Promise.resolve({ symbol: 'foo' }))
    }
    //#endregion
}

interface AllowListAsset {
    contract: string;
    id: number;
    image_url?: string;
    name: string;
    symbol: string;
}

type SearchResultAsset = AllowListAsset;

interface GasFeeResponse {
    fast_price: string;
    propose_price: string;
    slow_price: string;
}
