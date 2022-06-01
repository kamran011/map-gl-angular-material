import { createReducer, on } from "@ngrx/store";
import * as mapActions from "./map.actions";
import { LngLatLike, LngLatBounds } from "mapbox-gl";

export interface MapState {
  center: LngLatLike;
  zoom: number;
  style:string;
  bbox: LngLatBounds;
  geoJSON?: any;
}

export const initialState: MapState = {
  center: {
    lat: 29.7604,
    lng: 95.3698
  },
  zoom: 13,
  style: `https://api.maptiler.com/maps/eef16200-c4cc-4285-9370-c71ca24bb42d/style.json?key=SoL71Zyf7SmLrVYWC7fQ`,
  bbox: undefined,
  geoJSON: {}
};

const _mapReducer = createReducer(
  initialState,
  on(mapActions.loadMapChanged, (state, { center, zoom, bbox  }) => ({
    center,zoom,bbox
  })),
  on(mapActions.updateDataSuccess, (state, { geoJSON }) => ({
    ...state,
    geoJSON
  }))
);

export function mapReducer(state, action) {
  return _mapReducer(state, action);
}

