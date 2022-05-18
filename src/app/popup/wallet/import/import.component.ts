import { GlobalService, NeonService } from '@/app/core';
import {
    AfterContentInit,
    Component,
    EventEmitter,
    OnInit,
    Output,
} from '@angular/core';
import { WalletInitConstant } from '../../_lib/constant';
import { WalletCreation, WalletImport } from '../../_lib/models';
import { Observable, of } from 'rxjs';
import { wallet } from '@cityofzion/neon-core';
import { Wallet } from '@cityofzion/neon-core/lib/wallet';

@Component({
    selector: 'wallet-import',
    templateUrl: 'import.component.html',
    styleUrls: ['import.component.scss'],
})
export class PopupWalletImportComponent implements OnInit, AfterContentInit {
    public loading = false;
    public isInit: boolean;
    public limit: any;

    public importType = '0';
    public walletImport: WalletImport;
    public hideImportPwd: boolean;
    public hideConfirmPwd: boolean;
    public hideWIF: boolean;
    public isWIF = true;

    public walletDep6Import: WalletImport;
    public dep6File: any;
    public dep6Json: Wallet = null;
    public dep6Name = '';
    public hideDep6Pwd: boolean;

    @Output() submit = new EventEmitter<any>();
    constructor(private global: GlobalService, private neon: NeonService) {
        this.isInit = true;
        this.limit = WalletInitConstant;

        this.walletImport = new WalletImport();
        this.hideImportPwd = true;
        this.hideWIF = true;
        this.hideConfirmPwd = true;

        this.walletDep6Import = new WalletImport();
        this.hideDep6Pwd = true;
    }

    ngOnInit() {}

    ngAfterContentInit(): void {
        setTimeout(() => {
            this.isInit = false;
        });
    }

    public onFileSelected(event: any) {
        this.dep6File = event.target.files[0];
        if (this.dep6File) {
            const reader = new FileReader();
            reader.readAsText(this.dep6File, 'UTF-8');
            reader.onload = (evt: any) => {
                this.dep6Json = JSON.parse(evt.target.result);
                if (
                    this.dep6Json.accounts === undefined ||
                    this.dep6Json.accounts[0] === undefined ||
                    !wallet.isNEP2(
                        (this.dep6Json.accounts[0] as any).key ||
                            this.dep6Json.name === undefined ||
                            this.dep6Json.name === ''
                    )
                ) {
                    this.global.snackBarTip('dep6Wrong');
                    this.dep6Json = null;
                    this.dep6Name = '';
                    this.walletDep6Import.walletName = '';
                }
                if (this.dep6Json.name !== undefined) {
                    this.dep6Name = this.dep6Json.name;
                    this.walletDep6Import.walletName = this.dep6Json.name;
                }
                this.walletDep6Import.EncrpytedKey = (this.dep6Json
                    .accounts[0] as any).key;
            };
            reader.onerror = (evt) => {
                console.log('error reading file');
            };
        }
    }

    public submitImport(): void {
        if (this.importType === '0') {
            if (
                !wallet.isWIF(this.walletImport.WIF) &&
                !wallet.isPrivateKey(this.walletImport.WIF)
            ) {
                this.isWIF = false;
                return;
            }
            this.loading = true;
            if (wallet.isPrivateKey(this.walletImport.WIF)) {
                this.neon
                    .importPrivateKey(
                        this.walletImport.WIF,
                        this.walletImport.password,
                        this.walletImport.walletName
                    )
                    .subscribe((res: any) => {
                        this.loading = false;
                        if (this.neon.verifyWallet(res)) {
                            this.submit.emit(res);
                        } else {
                            this.global.snackBarTip('existingWallet');
                        }
                    });
            } else {
                this.neon
                    .importWIF(
                        this.walletImport.WIF,
                        this.walletImport.password,
                        this.walletImport.walletName
                    )
                    .subscribe(
                        (res: any) => {
                            this.loading = false;
                            if (this.neon.verifyWallet(res)) {
                                this.submit.emit(res);
                            } else {
                                this.global.snackBarTip('existingWallet');
                            }
                        },
                        (err: any) => {
                            this.global.log('import wallet faild', err);
                            this.global.snackBarTip('walletImportFailed');
                            this.loading = false;
                        }
                    );
            }
        } else {
            if (!wallet.isNEP2(this.walletDep6Import.EncrpytedKey)) {
                return;
            }
            this.loading = true;
            this.neon
                .importEncryptKey(
                    this.walletDep6Import.EncrpytedKey,
                    this.walletDep6Import.password,
                    this.walletDep6Import.walletName
                )
                .subscribe(
                    (res: any) => {
                        this.loading = false;
                        if (this.neon.verifyWallet(res)) {
                            this.submit.emit(res);
                        } else {
                            this.global.snackBarTip('existingWallet');
                        }
                    },
                    (err: any) => {
                        this.loading = false;
                        this.global.log('import wallet faild', err);
                        this.global.snackBarTip('walletImportFailed', '');
                    }
                );
        }
    }

    public cancel() {
        history.go(-1);
    }
}
