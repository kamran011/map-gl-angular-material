import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';

import { StoreModule } from "@ngrx/store";
import { mapReducer } from "./store/map.reducer";
import { MapFacadeService } from "./store/mapFacade.service";
import { geoJSONApiService } from "./services/geoJSONApi.service";
import { EffectsModule } from "@ngrx/effects";
import { MapEffects } from "./store/map.effects";
import { HttpClientModule } from "@angular/common/http";
import { MarkerComponent } from './marker/marker.component';
import { LayerComponent } from './layers/layer.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { AutoZoomToCenterComponent } from './examples/center-on-symbol.component';
import { DynamicPlaceMarkerComponent } from './examples/dynamic-place-marker.component';
import { CustomStyleIdComponent } from './examples/custom-style-id.component';
import { DisplayMapComponent } from './examples/display-map.component';
import { ZoomtoLinestringComponent } from './examples/zoomto-linestring.component';
import { LayoutComponent } from './layout/layout.component';
import { ControlComponent } from './control/control.component';
import { GeocoderControlDirective } from './directives/geocoder-control.directive';


@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    MarkerComponent,
    ControlComponent,
    LayerComponent,
    LayoutComponent,
    DisplayMapComponent,
    CustomStyleIdComponent,
    DynamicPlaceMarkerComponent,
    AutoZoomToCenterComponent,
    ZoomtoLinestringComponent,
    GeocoderControlDirective
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    CommonModule,
    BrowserAnimationsModule,
    MatRadioModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatListModule,
    MatToolbarModule,
    MatCardModule,
    FormsModule,
    StoreModule.forRoot({
      map: mapReducer
    }),
    EffectsModule.forRoot([
      MapEffects
    ]),
  ],
  providers: [
    MapFacadeService,
    geoJSONApiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
