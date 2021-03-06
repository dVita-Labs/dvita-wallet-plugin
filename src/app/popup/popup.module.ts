import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { PopupRoutingModule } from './popup.route';
import { ShareModule } from '@app/share';

//#region third modules
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';

const THIRD_MODULES = [
    MatMenuModule,
    MatSnackBarModule,
    MatDialogModule,
    MatSliderModule,
    MatSidenavModule,
    MatListModule,
];
//#endregion

//#region modules
import { PopupAddAssetModule } from './add-asset/add-asset.module';
import { PopupNotificationModule } from './notification/notification.module';
import { TransferModule } from './transfer/transfer.module';
import { PopupWalletModule } from './wallet/wallet.module';

const POPUP_MODULES = [
    PopupAddAssetModule,
    PopupNotificationModule,
    TransferModule,
    PopupWalletModule,
];
//#endregion

//#region components
import { PopupComponent } from './popup.component';

const POPUP_COMPONENTS = [
    PopupComponent,
];
//#endregion

//#region dialogs
import {
    PopupConfirmDialogComponent,
    PopupHomeMenuDialogComponent,
    PopupAddressDialogComponent,
    PopupAssetDialogComponent,
    PopupTxDetailDialogComponent,
    PopupTransferSuccessDialogComponent,
    PopupEditFeeDialogComponent,
    PopupBackupTipDialogComponent,
    PopupSubscriptionEmailDialogComponent,
    PopupAuthorizationListDialogComponent,
    PopupQRCodeDialogComponent,
    PopupSelectDialogComponent,
    PopupNameDialogComponent,
    PopupAddTokenDialogComponent,
} from '@popup/_dialogs';

const POPUP_DIALOGS = [
    PopupConfirmDialogComponent,
    PopupHomeMenuDialogComponent,
    PopupAddressDialogComponent,
    PopupAssetDialogComponent,
    PopupTxDetailDialogComponent,
    PopupTransferSuccessDialogComponent,
    PopupEditFeeDialogComponent,
    PopupBackupTipDialogComponent,
    PopupSubscriptionEmailDialogComponent,
    PopupAuthorizationListDialogComponent,
    PopupQRCodeDialogComponent,
    PopupSelectDialogComponent,
    PopupNameDialogComponent,
    PopupAddTokenDialogComponent,
];

//#endregion

@NgModule({
    declarations: [...POPUP_DIALOGS, ...POPUP_COMPONENTS],
    imports: [
        FormsModule,
        CommonModule,
        PopupRoutingModule,
        ShareModule,
        ...THIRD_MODULES,
        ...POPUP_MODULES,
    ],
    exports: [],
    entryComponents: [...POPUP_DIALOGS],
})
export class PopupModule {}
