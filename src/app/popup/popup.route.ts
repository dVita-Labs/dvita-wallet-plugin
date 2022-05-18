import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';

import { PopupComponent } from '@popup/popup.component';
import { PopupAboutComponent } from './about/about.component';
import { PopupAccountComponent } from './account/account.component';
import { PopupAssetDetailComponent } from './asset-detail/asset-detail.component';
import { PopupBackupComponent } from './backup/backup.component';
import { PopupHomeComponent } from './home';
import { PopupLoginComponent } from './login/login.component';
import { PopupNewWalletGuideComponent } from './new-wallet-guide/new-wallet-guide.component';
import { PopupExportComponent } from './export/export.component';
import { PopupSettingComponent } from './setting/setting.component';

// prettier-ignore
const routes: Routes = [
    {
        path: 'popup',
        component: PopupComponent,
        children: [
            { path: '', redirectTo: `/popup/home`, pathMatch: 'full' },
            { path: 'about', loadChildren: () => import('./about/about.module').then(m => m.AboutModule) },
            { path: 'account', loadChildren: () => import('./account/account.module').then(m => m.AccountModule) },
            { path: 'export', loadChildren: () => import('./export/export.module').then(m => m.ExportModule) },
            { path: 'asset/:assetId', loadChildren: () => import('./asset-detail/asset-detail.module').then(m => m.AssetDetailModule) },
            { path: 'backup', loadChildren: () => import('./backup/backup.module').then(m => m.BackupModule) },
            { path: 'home', loadChildren: () => import('./home/home.module').then(m => m.HomeModule) },
            { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },
            { path: 'wallet/new-guide', loadChildren: () => import('./new-wallet-guide/new-wallet-guide.module').then(m => m.NewWalletGuideModule) },
            { path: 'setting', loadChildren: () => import('./setting/setting.module').then(m => m.SettingModule) },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class PopupRoutingModule {}
