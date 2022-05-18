import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PopupBackupComponent } from './backup.component';
import { PopupWalletGuard } from '@app/core';

const routes: Routes = [{ path: '', component: PopupBackupComponent, canActivate: [PopupWalletGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BackupRoutingModule {}
