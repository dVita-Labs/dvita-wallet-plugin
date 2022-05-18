import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupSettingComponent } from './setting.component';
import { PopupWalletGuard } from '@app/core';

const routes: Routes = [{ path: '', component: PopupSettingComponent, canActivate: [PopupWalletGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingRoutingModule {}
