import { Component } from '@angular/core';

@Component({
  template: `
  <app-map
    [style]="'mapbox://styles/mapbox/dark-v9'"
    [zoom]="[3]"
    [center]="[-77.38, 39]"
  >
  </app-map>
  `,
  styleUrls: ['./examples.css']
})
export class CustomStyleIdComponent { }
