import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AutoZoomToCenterComponent } from './examples/center-on-symbol.component';
import { DynamicPlaceMarkerComponent } from './examples/dynamic-place-marker.component';
import { CustomStyleIdComponent } from './examples/custom-style-id.component';
import { DisplayMapComponent } from './examples/display-map.component';
import { ZoomtoLinestringComponent } from './examples/zoomto-linestring.component';
import { LayoutComponent } from './layout/layout.component';

export enum Category {
  STYLES = 'Styles',
  LAYERS = 'Layers',
  SOURCES = 'Sources',
  USER_INTERACTION = 'User interaction',
  CAMERA = 'Camera',
  CONTROLS_AND_OVERLAYS = 'Controls and overlays',
}

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: '/load-pins', pathMatch: 'full' },
      { path: 'load-pins', component: DisplayMapComponent, data: { label: 'Load Pins', cat: Category.STYLES } },
      { path: 'replace-marker-dynamically', component: DynamicPlaceMarkerComponent, data: { label: 'Replace Pin On Map Dynamically', cat: Category.CONTROLS_AND_OVERLAYS } },
      { path: 'zoomto', component: ZoomtoLinestringComponent, data: { label: 'Zoom To', cat: Category.USER_INTERACTION } },
      { path: 'custom-map-style', component: CustomStyleIdComponent, data: { label: 'Display a map with a custom style', cat: Category.STYLES } },
      { path: 'auto-zoom', component: AutoZoomToCenterComponent, data: { label: 'Auto Zoom to center map', cat: Category.USER_INTERACTION } },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
