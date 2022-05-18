import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GlobalService } from './services/global.service';
import { NeonService } from './services/neon.service';
import { ChromeService } from './services/chrome.service';
import { NotificationService } from './services/notification.service';
import { HttpClientModule } from '@angular/common/http';
import { HttpService } from './services/http.service';
import { WalletGuard, PopupWalletGuard, OpenedWalletGuard, PopupLoginGuard } from './guards/wallet.guard';
import { AssetState } from './states/asset.state';
import { TransactionState } from './states/transaction.state';
import { BlockState } from './states/block.state';
import { LoaderDialog } from './dialogs/loader/loader.dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SettingState } from './states/setting.state';

@NgModule({
    declarations: [
        LoaderDialog
    ],
    imports: [
        CommonModule, HttpClientModule,
        MatProgressSpinnerModule, MatDialogModule
    ],
    exports: [],
    providers: [
        GlobalService, NeonService, ChromeService, HttpService,
        WalletGuard, PopupWalletGuard, OpenedWalletGuard, PopupLoginGuard,
        AssetState, TransactionState, BlockState, NotificationService,
        SettingState
    ],
    entryComponents: [
        LoaderDialog
    ]
})
export class CoreModule { }
