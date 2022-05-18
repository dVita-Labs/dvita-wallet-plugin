import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ChromeService, GlobalService, AssetState, NeonService } from '@app/core';
import { Router } from '@angular/router';
import { Language, getValidLanguage } from '@/utils/language';

@Component({
    templateUrl: 'select.dialog.html',
    styleUrls: ['select.dialog.scss'],
})
export class PopupSelectDialogComponent implements OnInit {
    public targetOption: string;
    public rateCurrency: string;

    constructor(
        private dialogRef: MatDialogRef<PopupSelectDialogComponent>,
        private chromeSer: ChromeService,
        private global: GlobalService,
        private router: Router,
        private assetSer: AssetState,
        private neonService: NeonService,
        @Inject(MAT_DIALOG_DATA)
        public data: {
            optionGroup: [];
            currentOption: string;
            type: 'lang' | 'currency';
        }
    ) {}

    ngOnInit() {
        this.rateCurrency = this.assetSer.rateCurrency;
        this.targetOption = this.data.currentOption;
    }

    public cancel() {
        this.dialogRef.close();
    }

    public select(targetOption: any) {
        this.targetOption = targetOption;
        if (this.data.currentOption === targetOption) {
            return;
        }
        switch (this.data.type) {
            case 'lang':
                const newLang = getValidLanguage(this.targetOption);
                this.chromeSer.setLang(newLang);
                this.global.snackBarTip('langSetSucc');
                location.href = `index.html#popup/setting`;
                break;
            case 'currency':
                this.rateCurrency = this.targetOption;
                this.assetSer.changeRateCurrency(this.rateCurrency);
                this.chromeSer.setRateCurrency(this.rateCurrency);
                this.dialogRef.close(this.targetOption);
                break;
        }
    }
}
