import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackupRoutingModule } from './backup-routing.module';
import { PopupBackupComponent } from './backup.component';
import { ShareModule } from '@app/share';

@NgModule({
  declarations: [PopupBackupComponent],
  imports: [
    CommonModule,
    ShareModule,
    BackupRoutingModule,
  ]
})
export class BackupModule { }
