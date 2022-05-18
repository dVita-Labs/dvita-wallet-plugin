import {
    Component,
    OnInit,
    AfterContentInit
} from '@angular/core';
import {
    WalletCreation
} from '../_lib/models';
import {
    WalletInitConstant
} from '../_lib/constant';
import { Wallet } from '@cityofzion/neon-core/lib/wallet';
import {
    Router, ActivatedRoute
} from '@angular/router';
import {
    NeonService
} from '@/app/core/services/neon.service';
import {
    ChromeService,
    GlobalService
} from '@/app/core';
import { MatDialog } from '@angular/material/dialog';
import { PopupConfirmDialogComponent } from '../_dialogs';
import { ERRORS, requestTarget } from '@/models/dapi';


@Component({
    templateUrl: 'login.component.html',
    styleUrls: ['login.component.scss']
})
export class PopupLoginComponent implements OnInit, AfterContentInit {
    public wallet: WalletCreation;
    public limit: any;
    public hidePwd: boolean;
    public loading = false;
    public isInit: boolean;
    public accountWallet: Wallet;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private neon: NeonService,
        private chrome: ChromeService,
        private global: GlobalService,
        private dialog: MatDialog
    ) {
        this.hidePwd = true;
        this.wallet = new WalletCreation();
        this.limit = WalletInitConstant;
        this.isInit = true;
    }

    ngOnInit(): void {
        this.accountWallet = this.neon.wallet;
        window.onbeforeunload = () => {
            this.chrome.windowCallback({
                data: ERRORS.CANCELLED,
                return: requestTarget.Login
            });
        };
    }

    ngAfterContentInit(): void {
        setTimeout(() => {
            this.isInit = false;
        });
    }

    public login() {
        this.loading = true;
        (this.accountWallet.accounts[0] as any).decrypt(this.wallet.password).then((res) => {
            if(this.route.snapshot.queryParams.notification !== undefined) {
                return this.chrome.windowCallback({
                    data: true,
                    return: requestTarget.Login
                }).then(() => window.close());
            }
            this.loading = false;
            this.chrome.verifyLogin();
            this.global.$wallet.next('open');
            const returnUrl = this.route.snapshot.queryParams.returnUrl || '/popup';
            this.router.navigateByUrl(returnUrl);
        }).catch((err) => {
            this.loading = false;
            this.global.snackBarTip('loginFailed');
        });
    }

    public togglePwd() {
        this.hidePwd = !this.hidePwd;
    }

    public resetWallet() {
        this.dialog.open(PopupConfirmDialogComponent, {
            data: 'resetWalletConfirm',
            panelClass: 'custom-dialog-panel'
        }).afterClosed().subscribe(confirm => {
            if (confirm) {
                this.neon.reset();
                this.chrome.resetWallet();
                this.router.navigateByUrl('/popup/wallet/new-guide');
            }
        });
    }
}
