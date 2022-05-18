import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportRoutingModule } from './export-routing.module';
import { PopupExportComponent } from './export.component';
import { ShareModule } from '@app/share';

@NgModule({
  declarations: [PopupExportComponent],
  imports: [
    CommonModule,
    ShareModule,
    ExportRoutingModule,
  ]
})
export class ExportModule { }
