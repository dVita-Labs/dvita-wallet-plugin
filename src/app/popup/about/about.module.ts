import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutRoutingModule } from './about-routing.module';
import { PopupAboutComponent } from './about.component';
import { ShareModule } from '@app/share';

@NgModule({
  declarations: [PopupAboutComponent],
  imports: [
    CommonModule,
    ShareModule,
    AboutRoutingModule,
  ]
})
export class AboutModule { }
