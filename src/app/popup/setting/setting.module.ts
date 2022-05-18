import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingRoutingModule } from './setting-routing.module';
import { PopupSettingComponent } from './setting.component';
import { ShareModule } from '@app/share';

@NgModule({
  declarations: [PopupSettingComponent],
  imports: [
    CommonModule,
    ShareModule,
    SettingRoutingModule,
  ]
})
export class SettingModule { }
