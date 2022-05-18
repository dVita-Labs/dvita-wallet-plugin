import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupAccountComponent } from './account.component';
import { PopupWalletGuard } from '@app/core';

const routes: Routes = [{ path: '', component: PopupAccountComponent, canActivate: [PopupWalletGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccountRoutingModule {}
