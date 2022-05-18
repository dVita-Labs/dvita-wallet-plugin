import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TransactionState, GlobalService, ChromeService } from '@/app/core';
import { WalletInitConstant } from '../../_lib/constant';

@Component({
    templateUrl: 'subscription-email.dialog.html',
    styleUrls: ['subscription-email.dialog.scss']
})
export class PopupSubscriptionEmailDialogComponent {
    isSelected = false;
    limit: any;
    email: string;
    emailRegExp;

    constructor(private global: GlobalService, private chrome: ChromeService) {
        this.limit = WalletInitConstant;
        this.emailRegExp = new RegExp(WalletInitConstant.emailPattern);
    }

    submit() {
        if (this.isSelected === false) {
            this.global.snackBarTip('agreePrivacyPolicy');
            return;
        }
    }

    async openPrivacyPolicy() {
        const lang = await this.chrome.getLang().toPromise();
        window.open(`https://neoline.io$/{lang}/privacy`);
    }
}
