import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeRoutingModule } from './home-routing.module';
import { PopupHomeComponent } from './home.component';
import { PopupAssetsComponent } from './assets/assets.component';
import { ShareModule } from '@app/share';

@NgModule({
  declarations: [PopupHomeComponent, PopupAssetsComponent],
  imports: [
    CommonModule,
    ShareModule,
    HomeRoutingModule,
  ]
})
export class HomeModule { }
