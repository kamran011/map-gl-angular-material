import { Component } from "@angular/core";
import { Map } from "mapbox-gl";
import { Observable } from "rxjs";
import { MapService } from "../services/map.service";
import { MapFacadeService } from "../store/mapFacade.service";
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import * as mapboxgl from 'mapbox-gl';

@Component({
  template: `
    <app-map
      [center]="mapService.initialCenter"
      [zoom]="[mapService.initialZoom]"
      (load)="mapService.loadMap($event)"
      [style]="'assets/map.style.json'"
      (moveEnd)="mapService.updateMap($event)"
    >
      <app-control mbGeocoder [searchInput]="'Houston'" [marker]="true" [mapboxgl]="mapboxgl"
      [accessToken]="'pk.eyJ1Ijoia2FtcmFucWF5eXVtOTQiLCJhIjoiY2t5cmRxMjM5MHN5djJxbzVicno0eHhxeiJ9.TIJxDUsyeh7qZTfO5qCeyA'"
      [position]="'top-right'"></app-control>
      <app-layer id="back" type="background" [paint]="paint"> </app-layer>
    </app-map>
  `,
  styleUrls: ["./examples.css"],
})
export class DynamicPlaceMarkerComponent {
  paint = { "background-color": "green", "background-opacity": 0.1 };
  geoJSON$: Observable<any>;
  mapboxgl = mapboxgl;

  constructor(
    public mapFacade: MapFacadeService,
    public mapService: MapService
  ) {
    this.geoJSON$ = mapFacade.geoJSON$;
  }

}
