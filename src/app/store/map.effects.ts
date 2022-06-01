import { Injectable } from "@angular/core";
import { Actions, Effect, ofType } from "@ngrx/effects";
import {
  updateData,
  updateDataSuccess,
  updateDataFailure,
  loadMapChanged,
  markerClick
} from "./map.actions";
import {
  switchMap,
  withLatestFrom,
  map,
  catchError,
  debounceTime,
  tap
} from "rxjs/operators";
import { MapFacadeService } from "./mapFacade.service";
import { of } from "rxjs";
import { geoJSONApiService } from "../services/geoJSONApi.service";
import { MapService } from "../services/map.service";

@Injectable()
export class MapEffects {
  @Effect()
  loadDataEffect$ = this.actions$.pipe(
    ofType(updateData),
    withLatestFrom(this.mapFacade.mapState$),
    switchMap(([_, mapState]) => {
      const { bbox, zoom, center } = mapState;
      return this.api.get(bbox).pipe(
        map(data => updateDataSuccess({ geoJSON: data })),
        catchError(err => of(updateDataFailure()))
      );
    })
  );

  @Effect()
  triggerUpdateEffect$ = this.actions$.pipe(
    ofType(loadMapChanged),
    debounceTime(200),
    map(() => updateData())
  );

  @Effect({
    dispatch: false
  })
  clickMarkerEffect$ = this.actions$.pipe(
    ofType(markerClick),
    tap(({ coords }) => {
      if(coords[0][0] && coords[0][0].length > 0){
        coords[0][0].forEach(coord => {
          this.mapService.flyTo(coord, 13);
        });
      }else{
        this.mapService.flyTo(coords, 13);
      }
    })
  );

  constructor(
    private actions$: Actions,
    private api: geoJSONApiService,
    private mapFacade: MapFacadeService,
    private mapService:MapService
  ) {}
}
