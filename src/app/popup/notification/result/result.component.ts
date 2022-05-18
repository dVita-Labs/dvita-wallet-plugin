import { Component, OnInit } from '@angular/core';

@Component({
    templateUrl: 'result.component.html',
    styleUrls: ['result.component.scss']
})
export class PopupNotificationResultComponent {
    constructor() { }

    public close() {
        window.close();
    }
}
