import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupAboutComponent } from './about.component';
import { PopupWalletGuard } from '@app/core';

const routes: Routes = [{ path: '', component: PopupAboutComponent, canActivate: [PopupWalletGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AboutRoutingModule {}
