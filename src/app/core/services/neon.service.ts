import { Injectable } from '@angular/core';
import { wallet, tx, rpc, sc, u } from '@cityofzion/neon-core';
import { Wallet, WalletJSON } from '@cityofzion/neon-core/lib/wallet';
import { Observable, from, Observer, of, Subject, forkJoin } from 'rxjs';
import { map, catchError, startWith, publish, refCount } from 'rxjs/operators';
import { ChromeService } from './chrome.service';
import { GlobalService } from './global.service';
import { Transaction } from '@cityofzion/neon-core/lib/tx';
import { UTXO, ClaimItem, GAS } from '@/models/models';
import { EVENT, TxHashAttribute } from '@/models/dapi';
import { bignumber } from 'mathjs';

@Injectable()
export class NeonService {
    currentWalletChainType: "Neo3" = "Neo3";
    selectedChainType: "Neo3" = "Neo3";

    private _neonWallet = wallet;
    private _neonTx: any = tx;
    private _neonRpc: any = rpc;
    // Create a chain to import the wallet
    private _selectedNeonWallet: typeof wallet = wallet;
    // The wallet array of the chain where the current wallet is located
    private _walletArr: Array<Wallet> = [];
    private _WIFArr: string[] = [];

    private _wallet: Wallet;
    private $wallet: Subject<Wallet> = new Subject();

    /**
     * Currently opened wallet, return null if unexists.
     * Get the currently opened wallet and return if it doesn't existnull
     */
    public get wallet(): Wallet {
        return this._wallet || null;
    }

    public get walletArr(): Array<Wallet> {
        return this._walletArr;
    }

    public get WIFArr(): string[] {
        return this._WIFArr;
    }

    public get neo3WalletArr(): Array<Wallet> {
        return this.walletArr;
    }

    public reset() {
        this._wallet = null;
        this._walletArr = [];
        this._WIFArr = [];
    }

    public pushWalletArray(w: WalletJSON) {
        this._walletArr.push(this.parseWallet(w));
    }
    public pushWIFArray(WIF: string) {
        this._WIFArr.push(WIF);
    }

    public export() {
        return this._wallet.export();
    }

    public getWalletArrayJSON(
        walletArr: Array<Wallet> = null
    ): Array<WalletJSON> {
        const res = [];
        if (walletArr === null) {
            this._walletArr.forEach((item) => {
                res.push(item.export());
            });
        } else {
            walletArr.forEach((item) => {
                res.push(item.export());
            });
        }
        return res;
    }

    /**
     * Determine whether the wallet address exists
     * @param w Wallet address
     */
    public verifyWallet(w: Wallet): boolean {
        if (this._walletArr === []) {
            return true;
        } else {
            if (
                this._walletArr.findIndex(
                    (item) => item.accounts[0].address === w.accounts[0].address
                ) >= 0
            ) {
                return false;
            } else {
                return true;
            }
        }
    }

    /**
     * Address of currently opened wallet, return null if unexists.
     * If the address in the currently opened wallet does not exist, returnnull
     */
    public get address(): string {
        return (
            this._wallet &&
            this._wallet.accounts[0] &&
            this._wallet.accounts[0].address
        );
    }
    constructor(private chrome: ChromeService, private global: GlobalService) {}

    public clearCache() {
        this._wallet = new Wallet();
        this._walletArr = [];
        this.$wallet = new Subject();
    }

    public walletIsOpen(): Observable<boolean> {
        const getWallet = this.chrome.getWallet();
        const getNeo3WIFArr = this.chrome.getWIFArray('Neo3');
        const getNeo3WalletArr = this.chrome.getWalletArray('Neo3');
        const Neo3AddressFlag = this.chrome.getUpdateNeo3AddressFlag();
        return forkJoin([
            getWallet,
            getNeo3WIFArr,
            getNeo3WalletArr,
            Neo3AddressFlag,
        ]).pipe(
            map((res) => {
                if (!res[3] && res[1] && res[1].length > 0 && res[2] && res[2].length > 0) {
                    res[2].forEach((item, index) => {
                        const account = new wallet.Account(wallet.getPrivateKeyFromWIF(res[1][index]));
                        item.accounts[0].address = account.label;
                        item.accounts[0].label = account.label;
                        if (item.accounts[0].key === res[0].accounts[0].key) {
                            res[0].accounts[0].address = item.accounts[0].address;
                            res[0].accounts[0].label = item.accounts[0].label;
                            this.chrome.setWallet(res[0]);
                        }
                    });
                    this.chrome.setWalletArray(res[2], 'Neo3');
                    this.chrome.setUpdateNeo3AddressFlag(true);
                }
                // wallet
                this._wallet = this.parseWallet(res[0]);
                this.$wallet.next(this._wallet);

                // neo3 WIFArr
                if (res[1] && res[1].length > 0) {
                    this._WIFArr = res[1];
                }

                // neo3 walletArr
                if (res[2] && res[2].length > 0) {
                    const tempArray = [];
                    res[2].forEach((item) => {
                        tempArray.push(this.parseWallet(item));
                    });
                    this._walletArr = tempArray;
                    return true;
                }
                return false;
            }),
            catchError((e) => {
                this.global.log('Check wallet opening error', e);
                return of(false);
            })
        );
    }
    /**
     * Create a new wallet include one DEP6 account.
     * Create a new wallet containing a single DEP6
     * @param key encrypt password for new address
     */
    public createWallet(key: string, name: string = null): Observable<any> {
        const privateKey = this._selectedNeonWallet.generatePrivateKey();
        const account = new this._selectedNeonWallet.Account(privateKey);
        const w = new wallet.Wallet({
            name: name || 'dVITAUser',
        } as any);
        w.addAccount(account);
        const wif = w.accounts[0].WIF;
        return from(w.accounts[0].encrypt(key)).pipe(
            map(() => {
                (w.accounts[0] as any).wif = wif;
                return w;
            })
        );
    }

    /**
     * Modify the account name of the wallet
     * @param name name of wallet
     */
    public updateWalletName(
        name: string,
        w: Wallet
    ): Observable<Wallet> {
        if (w === this._wallet || w === null) {
            this._wallet.name = name;
            this.$wallet.next(this._wallet);
            return of(this._wallet);
        } else {
            w.name = name;
            return of(w);
        }
    }

    public delWallet(w: Wallet): Observable<boolean> {
        const index = this._walletArr.findIndex(
            (item) => item.accounts[0].address === w.accounts[0].address
        );
        if (
            w.accounts[0].address === this._wallet.accounts[0].address ||
            w === null
        ) {
            if (this.walletArr.length === 1) {
                this._walletArr.splice(index, 1);
                if (this._WIFArr.length > index) {
                    this._WIFArr.splice(index, 1);
                }
                this.chrome.setWalletArray(
                    this.getWalletArrayJSON(),
                    this.currentWalletChainType
                );
                this.chrome.setWIFArray(
                    this._WIFArr,
                    this.currentWalletChainType
                );

                this.chrome.closeWallet();
                this.chrome.windowCallback({
                    data: {
                        address: this.wallet.accounts[0].address || '',
                        label: this.wallet.name || '',
                    },
                    return: EVENT.DISCONNECTED,
                });
            } else {
                this._walletArr.splice(index, 1);
                if (this._WIFArr.length > index) {
                    this._WIFArr.splice(index, 1);
                }
                this._wallet = this._walletArr[0];
                this.chrome.setWallet(this._wallet.export());
                this.chrome.setWalletArray(
                    this.getWalletArrayJSON(),
                    this.currentWalletChainType
                );
                this.chrome.setWIFArray(
                    this._WIFArr,
                    this.currentWalletChainType
                );
            }
            return of(true);
        } else {
            if (this._WIFArr.length > index) {
                this._WIFArr.splice(index, 1);
            }
            this._walletArr.splice(index, 1);
            this.chrome.setWalletArray(
                this.getWalletArrayJSON(),
                this.currentWalletChainType
            );
            this.chrome.setWIFArray(this._WIFArr, this.currentWalletChainType);
            return of(false);
        }
    }

    /**
     * Create a new wallet include given private key and encrypt by given password.
     * Create a new wallet containing the specified private key and encrypt it
     * @param privKey private key to import
     * @param key encrypt password for new address
     */
    public importPrivateKey(
        privKey: string,
        key: string,
        name: string = null
    ): Observable<Wallet> {
        const account = new this._selectedNeonWallet.Account(privKey);
        const w = new wallet.Wallet({
            name: name || 'dVITAUser',
        } as any);
        w.addAccount(account);
        const wif = w.accounts[0].WIF;
        w.encrypt(0, key);
        return from(w.accounts[0].encrypt(key)).pipe(
            map(() => {
                (w.accounts[0] as any).wif = wif;
                return w;
            })
        );
    }
    /**
     * Create a new wallet include given private key and encrypt by given password.
     * Create a new wallet containing the specified private key and encrypt it
     * @param privKey private key to import
     * @param key encrypt password for new address
     */
    public importWIF(
        wif: string,
        key: string,
        name: string = null
    ): Observable<Wallet> {
        const account = new this._selectedNeonWallet.Account(
            this._selectedNeonWallet.getPrivateKeyFromWIF(wif)
        );
        const w = new wallet.Wallet({
            name: name || 'dVITAUser',
        } as any);
        w.addAccount(account);
        w.encrypt(0, key);
        return from(w.accounts[0].encrypt(key)).pipe(
            map(() => {
                (w.accounts[0] as any).wif = wif;
                return w;
            })
        );
    }
    /**
     * Create a new wallet include given encrypted key and try decrypt it by given password.
     * Create a wallet containing the specified encrypted private key, and try to decrypt it to verify the password
     * @param encKey encrypted key to import
     * @param key encrypt password for this encKey
     */
    public importEncryptKey(
        encKey: string,
        key: string,
        name: string
    ): Observable<Wallet> {
        return new Observable((observer: Observer<Wallet>) => {
            const w = new wallet.Wallet({
                name: name || 'dVITAUser',
            } as any);
            w.addAccount(new this._selectedNeonWallet.Account(encKey));
            this._selectedNeonWallet
                .decrypt(encKey, key)
                .then((wif) => {
                    const account = new this._selectedNeonWallet.Account(
                        this._selectedNeonWallet.getPrivateKeyFromWIF(wif)
                    );
                    const returnRes = new wallet.Wallet({
                        name: name || 'dVITAUser',
                    } as any);
                    returnRes.addAccount(account);
                    returnRes.encrypt(0, key);
                    returnRes.accounts[0].encrypt(key).then((res) => {
                        (returnRes.accounts[0] as any).wif = wif;
                        observer.next(returnRes);
                    });
                })
                .catch((err) => {
                    observer.error('import failed');
                });
        });
    }
    public parseWallet(src: any): Wallet {
        try {
            if (!wallet.isAddress(src.accounts[0].address)) {
                throw new Error(`${src.accounts[0].address} is not a Neo3 address`);
            }
            const w = new Wallet(src);
            if (!w.accounts.length) {
                return null;
            }
            return w;
        } catch (e) {
            console.warn('Failed to parse wallet:', src, e);
            return null;
        }
    }

    public createTxForNEP5(
        fraomAddress: string,
        to: string,
        scriptHash: string,
        amount: string,
        decimals: number,
        broadcastOverride: boolean = false
    ): Transaction {
        const fromScript = this._neonWallet.getScriptHashFromAddress(
            fraomAddress
        );
        const toScript = this._neonWallet.getScriptHashFromAddress(to);
        if (fromScript.length !== 40 || toScript.length !== 40) {
            throw new Error('target address error');
        }
        const newTx = new this._neonTx.InvocationTransaction();
        const amountBigNumber = bignumber(amount).mul(
            bignumber(10).pow(decimals)
        );
        newTx.script = sc.createScript({
            scriptHash:
                scriptHash.startsWith('0x') && scriptHash.length === 42
                    ? scriptHash.substring(2)
                    : scriptHash,
            operation: 'transfer',
            args: [
                sc.ContractParam.string(u.reverseHex(fromScript)),
                sc.ContractParam.string(u.reverseHex(toScript)),
                sc.ContractParam.integer(
                    amountBigNumber.toFixed()
                ),
            ],
        });
        newTx.addAttribute(
            this._neonTx.TxAttrUsage.Script,
            u.reverseHex(fromScript)
        );
        const remark = broadcastOverride
            ? 'From dVITA Wallet'
            : `From dVITA Wallet at ${new Date().getTime()}`;
        newTx.addAttribute(
            this._neonTx.TxAttrUsage.Remark1,
            u.str2hexstring(remark)
        );
        return newTx;
    }

    public getVerificationSignatureForSmartContract(
        ScriptHash: string
    ): Promise<any> {
        return this._neonRpc.Query.getContractState(ScriptHash)
            .execute(this.global.RPCDomain)
            .then(({ result }) => {
                const { parameters } = result;
                return new this._neonTx.Witness({
                    invocationScript: '00'.repeat(parameters.length),
                    verificationScript: '',
                });
            });
    }

    public isAsset(assetId: string): boolean {
        return assetId.startsWith('0x')
            ? assetId.length === 66
            : assetId.length === 64;
    }

    /**
     * When changing the wallet name, the web header name is changed accordingly
     */
    public walletSub(): Observable<Wallet> {
        return this._wallet
            ? this.$wallet.pipe(startWith(this._wallet), publish(), refCount())
            : this.$wallet.pipe(publish(), refCount());
    }

    private zeroPad(
        input: string | any[] | sc.OpCode,
        length: number,
        padEnd?: boolean
    ) {
        const zero = '0';
        input = String(input);

        if (padEnd) {
            return input + zero.repeat(length - input.length);
        }

        return zero.repeat(length - input.length) + input;
    }

    public parseTxHashAttr({
        type,
        value,
        txAttrUsage,
    }: TxHashAttribute): TxHashAttribute {
        let parsedValue = this.zeroPad(value, 64, true);
        switch (type) {
            case 'Boolean':
                throw new Error(`Do not know how to parse it for neo3`);
                parsedValue = this.zeroPad(
                    // @ts-ignore
                    !!value ? sc.OpCode.PUSHT : sc.OpCode.PUSHF, // TODO how to parse this for neo3? OpCodes are different
                    64,
                    true
                );
                break;
            case 'Address':
                parsedValue = this.zeroPad(
                    u.reverseHex(
                        this._neonWallet.getScriptHashFromAddress(value)
                    ),
                    64,
                    true
                );
                break;
            case 'Integer':
                const h = Number(value).toString(16);
                parsedValue = this.zeroPad(
                    u.reverseHex(h.length % 2 ? '0' + h : h),
                    64,
                    true
                );
                break;
            case 'String':
                parsedValue = this.zeroPad(
                    u.ab2hexstring(u.str2ab(value)),
                    64,
                    true
                );
                break;
        }

        return {
            type,
            value: parsedValue,
            txAttrUsage,
        };
    }
}
