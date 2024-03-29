import { createSelector, createFeatureSelector } from "@ngrx/store";
import { MapState } from "./map.reducer";

export const getMapState = createFeatureSelector<MapState>("map");

export const getCurrentCenter = createSelector(
  getMapState,
  (state: MapState) => state.center
);

export const getCurrentZoom = createSelector(
  getMapState,
  (state: MapState) => state.zoom
);

export const getCurrentStyle = createSelector(
  getMapState,
  (state: MapState) => state.style
);

export const getCurrentBBox = createSelector(
  getMapState,
  (state: MapState) => state.bbox
);

export const getGeoJSON = createSelector(
  getMapState,
  (state: MapState) => state.geoJSON
);




