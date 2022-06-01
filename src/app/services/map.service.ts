import {
  EventEmitter,
  Inject,
  Injectable,
  InjectionToken,
  NgZone,
  Optional,
} from '@angular/core';
import * as MapboxGl from 'mapbox-gl';
import { AsyncSubject, Observable, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';
import { LayerEvents, MapEvent } from '../types/map.types';
import { GeoJSON } from 'GeoJSON';
import { LngLatLike, Map } from 'maplibre-gl';
import { MapFacadeService } from '../store/mapFacade.service';


export const MAPBOX_API_KEY = new InjectionToken('MapboxApiKey');

export interface SetupLayer {
  layerOptions: MapboxGl.Layer;
  layerEvents: LayerEvents;
}

export interface SetupMarker {
  markersOptions: {
    pitchAlignment?: MapboxGl.MarkerOptions['pitchAlignment'];
    rotationAlignment?: MapboxGl.MarkerOptions['rotationAlignment'];
    offset?: MapboxGl.MarkerOptions['offset'];
    anchor?: MapboxGl.MarkerOptions['anchor'];
    draggable?: MapboxGl.MarkerOptions['draggable'];
    element: HTMLElement;
    feature?: GeoJSON.Feature<GeoJSON.Point>;
    lngLat?: MapboxGl.LngLatLike;
    clickTolerance?: MapboxGl.MarkerOptions['clickTolerance'];
  };
  markersEvents: {
    markerDragStart: EventEmitter<MapboxGl.Marker>;
    markerDrag: EventEmitter<MapboxGl.Marker>;
    markerDragEnd: EventEmitter<MapboxGl.Marker>;
    dragStart: EventEmitter<MapboxGl.Marker>;
    drag: EventEmitter<MapboxGl.Marker>;
    dragEnd: EventEmitter<MapboxGl.Marker>;
  };
}


export interface SetupMap {
  accessToken?: string;
  customMapboxApiUrl?: string;
  mapOptions: Omit<MapboxGl.MapboxOptions, 'bearing' | 'pitch' | 'zoom'> & {
    bearing?: [number];
    pitch?: [number];
    zoom?: [number];
  };
  mapEvents: MapEvent;
}

export type MovingOptions =
  | MapboxGl.FlyToOptions
  | (MapboxGl.AnimationOptions & MapboxGl.CameraOptions)
  | MapboxGl.CameraOptions;

@Injectable({
  providedIn:'root'
})
export class MapService {
  mapInstance: MapboxGl.Map;
  mapCreated$: Observable<void>;
  mapLoaded$: Observable<void>;
  mapEvents: MapEvent;
  public map: Map;
  private mapCreated = new AsyncSubject<void>();
  private mapLoaded = new AsyncSubject<void>();
  private markersToRemove: MapboxGl.Marker[] = [];
  private subscription = new Subscription();

  initialCenter = {
    lat: 29.7604,
    lng: -95.3698
  };
  initialZoom : number = 9;

  constructor(
    private zone: NgZone , private mapFacade : MapFacadeService,
    @Optional() @Inject(MAPBOX_API_KEY) private readonly MAPBOX_API_KEY: string
  ) {
    this.mapCreated$ = this.mapCreated.asObservable();
    this.mapLoaded$ = this.mapLoaded.asObservable();
  }


  addMarker(marker: SetupMarker) {
    const options: MapboxGl.MarkerOptions = {
      offset: marker.markersOptions.offset,
      anchor: marker.markersOptions.anchor,
      draggable: !!marker.markersOptions.draggable,
      rotationAlignment: marker.markersOptions.rotationAlignment,
      pitchAlignment: marker.markersOptions.pitchAlignment,
      clickTolerance: marker.markersOptions.clickTolerance,
    };
    if (marker.markersOptions.element.childNodes.length > 0) {
      options.element = marker.markersOptions.element;
    }
    const markerInstance = new MapboxGl.Marker(options);
    if (
      marker.markersEvents.markerDragStart.observers.length ||
      marker.markersEvents.dragStart.observers.length
    ) {
      markerInstance.on('dragstart', (event) => {
        if (event) {
          const { target } = event as { target: MapboxGl.Marker };
          this.zone.run(() => {
            marker.markersEvents.markerDragStart.emit(target);
            marker.markersEvents.dragStart.emit(target);
          });
        }
      });
    }
    /*

     */
    if (
      marker.markersEvents.markerDrag.observers.length ||
      marker.markersEvents.drag.observers.length
    ) {
      markerInstance.on('drag', (event) => {
        if (event) {
          const { target } = event as { target: MapboxGl.Marker };
          this.zone.run(() => {
            marker.markersEvents.markerDrag.emit(target);
            marker.markersEvents.drag.emit(target);
          });
        }
      });
    }
    if (
      marker.markersEvents.markerDragEnd.observers.length ||
      marker.markersEvents.dragEnd.observers.length
    ) {
      markerInstance.on('dragend', (event) => {
        if (event) {
          const { target } = event as { target: MapboxGl.Marker };
          this.zone.run(() => {
            marker.markersEvents.markerDragEnd.emit(target);
            marker.markersEvents.dragEnd.emit(target);
          });
        }
      });
    }
    const lngLat: MapboxGl.LngLatLike = marker.markersOptions.feature ? <[number, number]>marker.markersOptions.feature.geometry!.coordinates
      : marker.markersOptions.lngLat!;

      if(lngLat[0][0] && lngLat[0][0].length > 0){
        lngLat[0][0].forEach(lnglat => {
          markerInstance.setLngLat(lnglat);
        });
      }else{
        markerInstance.setLngLat(lngLat);
      }



    return this.zone.runOutsideAngular(() => {
      markerInstance.addTo(this.mapInstance);
      return markerInstance;
    });
  }

  removeMarker(marker: MapboxGl.Marker) {
    this.markersToRemove.push(marker);
  }



  setup(options: SetupMap) {
    // Need onStable to wait for a potential @angular/route transition to end
    this.zone.onStable.pipe(first()).subscribe(() => {
      // Workaround rollup issue
      this.assign(
        MapboxGl,
        'accessToken',
        options.accessToken || this.MAPBOX_API_KEY
      );
      if (options.customMapboxApiUrl) {
        this.assign(MapboxGl, 'config.API_URL', options.customMapboxApiUrl);
      }
      this.createMap(options.mapOptions as MapboxGl.MapboxOptions);
      this.hookEvents(options.mapEvents);
      this.mapEvents = options.mapEvents;
      this.mapCreated.next(undefined);
      this.mapCreated.complete();
    });
  }

  private hookEvents(events: MapEvent) {
    this.mapInstance.on('load', (evt) => {
      this.mapLoaded.next(undefined);
      this.mapLoaded.complete();
      this.zone.run(() => {
        events.mapLoad.emit(evt.target);
        events.load.emit(evt.target);
      });
    });
    if (events.mapResize.observers.length || events.resize.observers.length) {
      this.mapInstance.on('resize', (evt) =>
        this.zone.run(() => {
          events.mapResize.emit(evt);
          events.resize.emit(evt);
        })
      );
    }
    if (events.mapRemove.observers.length || events.remove.observers.length) {
      this.mapInstance.on('remove', (evt) =>
        this.zone.run(() => {
          events.mapRemove.emit(evt);
          events.remove.emit(evt);
        })
      );
    }
    if (
      events.mapMouseDown.observers.length ||
      events.mouseDown.observers.length
    ) {
      this.mapInstance.on('mousedown', (evt) =>
        this.zone.run(() => {
          events.mapMouseDown.emit(evt);
          events.mouseDown.emit(evt);
        })
      );
    }
    if (events.mapMouseUp.observers.length || events.mouseUp.observers.length) {
      this.mapInstance.on('mouseup', (evt) =>
        this.zone.run(() => {
          events.mapMouseUp.emit(evt);
          events.mouseUp.emit(evt);
        })
      );
    }
    if (
      events.mapMouseMove.observers.length ||
      events.mouseMove.observers.length
    ) {
      this.mapInstance.on('mousemove', (evt) =>
        this.zone.run(() => {
          events.mapMouseMove.emit(evt);
          events.mouseMove.emit(evt);
        })
      );
    }
    if (events.mapClick.observers.length || events.click.observers.length) {
      this.mapInstance.on('click', (evt) =>
        this.zone.run(() => {
          events.mapClick.emit(evt);
          events.click.emit(evt);
        })
      );
    }
    if (
      events.mapDblClick.observers.length ||
      events.dblClick.observers.length
    ) {
      this.mapInstance.on('dblclick', (evt) =>
        this.zone.run(() => {
          events.mapDblClick.emit(evt);
          events.dblClick.emit(evt);
        })
      );
    }
    if (
      events.mapMouseOver.observers.length ||
      events.mouseOver.observers.length
    ) {
      this.mapInstance.on('mouseover', (evt) =>
        this.zone.run(() => {
          events.mapMouseOver.emit(evt);
          events.mouseOver.emit(evt);
        })
      );
    }
    if (
      events.mapMouseOut.observers.length ||
      events.mouseOut.observers.length
    ) {
      this.mapInstance.on('mouseout', (evt) =>
        this.zone.run(() => {
          events.mapMouseOut.emit(evt);
          events.mouseOut.emit(evt);
        })
      );
    }
    if (
      events.mapContextMenu.observers.length ||
      events.contextMenu.observers.length
    ) {
      this.mapInstance.on('contextmenu', (evt) =>
        this.zone.run(() => {
          events.mapContextMenu.emit(evt);
          events.contextMenu.emit(evt);
        })
      );
    }
    if (
      events.mapTouchStart.observers.length ||
      events.touchStart.observers.length
    ) {
      this.mapInstance.on('touchstart', (evt) =>
        this.zone.run(() => {
          events.mapTouchStart.emit(evt);
          events.touchStart.emit(evt);
        })
      );
    }
    if (
      events.mapTouchEnd.observers.length ||
      events.touchEnd.observers.length
    ) {
      this.mapInstance.on('touchend', (evt) =>
        this.zone.run(() => {
          events.mapTouchEnd.emit(evt);
          events.touchEnd.emit(evt);
        })
      );
    }
    if (
      events.mapTouchMove.observers.length ||
      events.touchMove.observers.length
    ) {
      this.mapInstance.on('touchmove', (evt) =>
        this.zone.run(() => {
          events.mapTouchMove.emit(evt);
          events.touchMove.emit(evt);
        })
      );
    }
    if (
      events.mapTouchCancel.observers.length ||
      events.touchCancel.observers.length
    ) {
      this.mapInstance.on('touchcancel', (evt) =>
        this.zone.run(() => {
          events.mapTouchCancel.emit(evt);
          events.touchCancel.emit(evt);
        })
      );
    }
    if (events.mapWheel.observers.length || events.wheel.observers.length) {
      this.mapInstance.on('wheel', (evt) =>
        this.zone.run(() => {
          events.mapWheel.emit(evt);
          events.wheel.emit(evt);
        })
      );
    }
    if (events.moveStart.observers.length) {
      this.mapInstance.on('movestart', (evt) =>
        this.zone.run(() => events.moveStart.emit(evt))
      );
    }
    if (events.move.observers.length) {
      this.mapInstance.on('move', (evt) =>
        this.zone.run(() => events.move.emit(evt))
      );
    }
    if (events.moveEnd.observers.length) {
      this.mapInstance.on('moveend', (evt) =>
        this.zone.run(() => events.moveEnd.emit(evt))
      );
    }
    if (
      events.mapDragStart.observers.length ||
      events.dragStart.observers.length
    ) {
      this.mapInstance.on('dragstart', (evt) =>
        this.zone.run(() => {
          events.mapDragStart.emit(evt);
          events.dragStart.emit(evt);
        })
      );
    }
    if (events.mapDrag.observers.length || events.drag.observers.length) {
      this.mapInstance.on('drag', (evt) =>
        this.zone.run(() => {
          events.mapDrag.emit(evt);
          events.drag.emit(evt);
        })
      );
    }
    if (events.mapDragEnd.observers.length || events.dragEnd.observers.length) {
      this.mapInstance.on('dragend', (evt) =>
        this.zone.run(() => {
          events.mapDragEnd.emit(evt);
          events.dragEnd.emit(evt);
        })
      );
    }
    if (events.zoomStart.observers.length) {
      this.mapInstance.on('zoomstart', (evt) =>
        this.zone.run(() => events.zoomStart.emit(evt))
      );
    }
    if (events.zoomEvt.observers.length) {
      this.mapInstance.on('zoom', (evt) =>
        this.zone.run(() => events.zoomEvt.emit(evt))
      );
    }
    if (events.zoomEnd.observers.length) {
      this.mapInstance.on('zoomend', (evt) =>
        this.zone.run(() => events.zoomEnd.emit(evt))
      );
    }
    if (events.rotateStart.observers.length) {
      this.mapInstance.on('rotatestart', (evt) =>
        this.zone.run(() => events.rotateStart.emit(evt))
      );
    }
    if (events.rotate.observers.length) {
      this.mapInstance.on('rotate', (evt) =>
        this.zone.run(() => events.rotate.emit(evt))
      );
    }
    if (events.rotateEnd.observers.length) {
      this.mapInstance.on('rotateend', (evt) =>
        this.zone.run(() => events.rotateEnd.emit(evt))
      );
    }
    if (events.pitchStart.observers.length) {
      this.mapInstance.on('pitchstart', (evt) =>
        this.zone.run(() => events.pitchStart.emit(evt))
      );
    }
    if (events.pitchEvt.observers.length) {
      this.mapInstance.on('pitch', (evt) =>
        this.zone.run(() => events.pitchEvt.emit(evt))
      );
    }
    if (events.pitchEnd.observers.length) {
      this.mapInstance.on('pitchend', (evt) =>
        this.zone.run(() => events.pitchEnd.emit(evt))
      );
    }
    if (events.boxZoomStart.observers.length) {
      this.mapInstance.on('boxzoomstart', (evt) =>
        this.zone.run(() => events.boxZoomStart.emit(evt))
      );
    }
    if (events.boxZoomEnd.observers.length) {
      this.mapInstance.on('boxzoomend', (evt) =>
        this.zone.run(() => events.boxZoomEnd.emit(evt))
      );
    }
    if (events.boxZoomCancel.observers.length) {
      this.mapInstance.on('boxzoomcancel', (evt) =>
        this.zone.run(() => events.boxZoomCancel.emit(evt))
      );
    }
    if (events.webGlContextLost.observers.length) {
      this.mapInstance.on('webglcontextlost', (evt) =>
        this.zone.run(() => events.webGlContextLost.emit(evt))
      );
    }
    if (events.webGlContextRestored.observers.length) {
      this.mapInstance.on('webglcontextrestored', (evt) =>
        this.zone.run(() => events.webGlContextRestored.emit(evt))
      );
    }
    if (events.render.observers.length) {
      this.mapInstance.on('render', (evt) =>
        this.zone.run(() => events.render.emit(evt))
      );
    }
    if (events.mapError.observers.length || events.error.observers.length) {
      this.mapInstance.on('error', (evt) =>
        this.zone.run(() => {
          events.mapError.emit(evt);
          events.error.emit(evt);
        })
      );
    }
    if (events.data.observers.length) {
      this.mapInstance.on('data', (evt) =>
        this.zone.run(() => events.data.emit(evt))
      );
    }
    if (events.styleData.observers.length) {
      this.mapInstance.on('styledata', (evt) =>
        this.zone.run(() => events.styleData.emit(evt))
      );
    }
    if (events.sourceData.observers.length) {
      this.mapInstance.on('sourcedata', (evt) =>
        this.zone.run(() => events.sourceData.emit(evt))
      );
    }
    if (events.dataLoading.observers.length) {
      this.mapInstance.on('dataloading', (evt) =>
        this.zone.run(() => events.dataLoading.emit(evt))
      );
    }
    if (events.styleDataLoading.observers.length) {
      this.mapInstance.on('styledataloading', (evt) =>
        this.zone.run(() => events.styleDataLoading.emit(evt))
      );
    }
    if (events.sourceDataLoading.observers.length) {
      this.mapInstance.on('sourcedataloading', (evt) =>
        this.zone.run(() => events.sourceDataLoading.emit(evt))
      );
    }
    if (events.styleImageMissing.observers.length) {
      this.mapInstance.on('styleimagemissing', (evt) =>
        this.zone.run(() => events.styleImageMissing.emit(evt))
      );
    }
    if (events.idle.observers.length) {
      this.mapInstance.on('idle', (evt) =>
        this.zone.run(() => events.idle.emit(evt))
      );
    }
  }

  private createMap(options: MapboxGl.MapboxOptions) {
    NgZone.assertNotInAngularZone();
    Object.keys(options).forEach((key: string) => {
      const tkey = <keyof MapboxGl.MapboxOptions>key;
      if (options[tkey] === undefined) {
        delete options[tkey];
      }
    });
    this.mapInstance = new MapboxGl.Map(options);

    const isIEorEdge =
      window && /msie\s|trident\/|edge\//i.test(window.navigator.userAgent);
    if (isIEorEdge) {
      this.mapInstance.setStyle(options.style!);
    }

    this.subscription.add(
      this.zone.onMicrotaskEmpty.subscribe(() => this.applyChanges())
    );
  }

  applyChanges() {
    this.zone.runOutsideAngular(() => {
      this.removeMarkers();
    });
  }

  private removeMarkers() {
    for (const marker of this.markersToRemove) {
      marker.remove();
    }
    this.markersToRemove = [];
  }

  // TODO move this elsewhere
  private assign(obj: any, prop: any, value: any) {
    if (typeof prop === 'string') {
      // tslint:disable-next-line:no-parameter-reassignment
      prop = prop.split('.');
    }
    if (prop.length > 1) {
      const e = prop.shift();
      this.assign(
        (obj[e] =
          Object.prototype.toString.call(obj[e]) === '[object Object]'
            ? obj[e]
            : {}),
        prop,
        value
      );
    } else {
      obj[prop[0]] = value;
    }
  }

  changeCanvasCursor(cursor: string) {
    const canvas = this.mapInstance.getCanvasContainer();
    canvas.style.cursor = cursor;
  }

  addLayer(layer: SetupLayer, bindEvents: boolean, before?: string) {
    this.zone.runOutsideAngular(() => {
      Object.keys(layer.layerOptions).forEach((key: string) => {
        const tkey = <keyof MapboxGl.AnyLayer>key;
        if (layer.layerOptions[tkey] === undefined) {
          delete layer.layerOptions[tkey];
        }
      });
      this.mapInstance.addLayer(
        layer.layerOptions as MapboxGl.AnyLayer,
        before
      );
      if (bindEvents) {
        if (
          layer.layerEvents.layerClick.observers.length ||
          layer.layerEvents.click.observers.length
        ) {
          this.mapInstance.on('click', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerClick.emit(evt);
              layer.layerEvents.click.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerDblClick.observers.length ||
          layer.layerEvents.dblClick.observers.length
        ) {
          this.mapInstance.on('dblclick', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerDblClick.emit(evt);
              layer.layerEvents.dblClick.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerMouseDown.observers.length ||
          layer.layerEvents.mouseDown.observers.length
        ) {
          this.mapInstance.on('mousedown', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerMouseDown.emit(evt);
              layer.layerEvents.mouseDown.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerMouseUp.observers.length ||
          layer.layerEvents.mouseUp.observers.length
        ) {
          this.mapInstance.on('mouseup', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerMouseUp.emit(evt);
              layer.layerEvents.mouseUp.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerMouseEnter.observers.length ||
          layer.layerEvents.mouseEnter.observers.length
        ) {
          this.mapInstance.on('mouseenter', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerMouseEnter.emit(evt);
              layer.layerEvents.mouseEnter.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerMouseLeave.observers.length ||
          layer.layerEvents.mouseLeave.observers.length
        ) {
          this.mapInstance.on('mouseleave', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerMouseLeave.emit(evt);
              layer.layerEvents.mouseLeave.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerMouseMove.observers.length ||
          layer.layerEvents.mouseMove.observers.length
        ) {
          this.mapInstance.on('mousemove', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerMouseMove.emit(evt);
              layer.layerEvents.mouseMove.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerMouseOver.observers.length ||
          layer.layerEvents.mouseOver.observers.length
        ) {
          this.mapInstance.on('mouseover', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerMouseOver.emit(evt);
              layer.layerEvents.mouseOver.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerMouseOut.observers.length ||
          layer.layerEvents.mouseOut.observers.length
        ) {
          this.mapInstance.on('mouseout', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerMouseOut.emit(evt);
              layer.layerEvents.mouseOut.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerContextMenu.observers.length ||
          layer.layerEvents.contextMenu.observers.length
        ) {
          this.mapInstance.on('contextmenu', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerContextMenu.emit(evt);
              layer.layerEvents.contextMenu.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerTouchStart.observers.length ||
          layer.layerEvents.touchStart.observers.length
        ) {
          this.mapInstance.on('touchstart', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerTouchStart.emit(evt);
              layer.layerEvents.touchStart.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerTouchEnd.observers.length ||
          layer.layerEvents.touchEnd.observers.length
        ) {
          this.mapInstance.on('touchend', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerTouchEnd.emit(evt);
              layer.layerEvents.touchEnd.emit(evt);
            });
          });
        }
        if (
          layer.layerEvents.layerTouchCancel.observers.length ||
          layer.layerEvents.touchCancel.observers.length
        ) {
          this.mapInstance.on('touchcancel', layer.layerOptions.id, (evt) => {
            this.zone.run(() => {
              layer.layerEvents.layerTouchCancel.emit(evt);
              layer.layerEvents.touchCancel.emit(evt);
            });
          });
        }
      }
    });
  }

  removeLayer(layerId: string) {
    this.zone.runOutsideAngular(() => {
      if (this.mapInstance.getLayer(layerId) != null) {
        this.mapInstance.removeLayer(layerId);
      }
    });
  }

  setLayerZoomRange(layerId: string, minZoom?: number, maxZoom?: number) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.setLayerZoomRange(
        layerId,
        minZoom ? minZoom : 0,
        maxZoom ? maxZoom : 20
      );
    });
  }

  setLayerFilter(layerId: string, filter: any[]) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.setFilter(layerId, filter);
    });
  }

  setLayerBefore(layerId: string, beforeId: string) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.moveLayer(layerId, beforeId);
    });
  }

  setAllLayerPaintProperty(
    layerId: string,
    paint:
      | MapboxGl.BackgroundPaint
      | MapboxGl.FillPaint
      | MapboxGl.FillExtrusionPaint
      | MapboxGl.LinePaint
      | MapboxGl.SymbolPaint
      | MapboxGl.RasterPaint
      | MapboxGl.CirclePaint
  ) {
    return this.zone.runOutsideAngular(() => {
      Object.keys(paint).forEach((key) => {
        // TODO Check for perf, setPaintProperty only on changed paint props maybe
        this.mapInstance.setPaintProperty(layerId, key, (<any>paint)[key]);
      });
    });
  }

  setAllLayerLayoutProperty(
    layerId: string,
    layout:
      | MapboxGl.BackgroundLayout
      | MapboxGl.FillLayout
      | MapboxGl.FillExtrusionLayout
      | MapboxGl.LineLayout
      | MapboxGl.SymbolLayout
      | MapboxGl.RasterLayout
      | MapboxGl.CircleLayout
  ) {
    return this.zone.runOutsideAngular(() => {
      Object.keys(layout).forEach((key) => {
        // TODO Check for perf, setPaintProperty only on changed paint props maybe
        this.mapInstance.setLayoutProperty(layerId, key, (<any>layout)[key]);
      });
    });
  }

  setMapRef(map: Map) {
    this.map = map;
  }

  flyTo(center: LngLatLike, zoom: number) {
    this.map.flyTo({
      center,
      zoom
    });
  }

  loadMap(map: Map) {
    this.setMapRef(map);
    this.mapFacade.mapChanged(map.getBounds(), map.getCenter(), map.getZoom());
  }

  updateMap(event: { target: Map }) {
    const { target } = event;
    this.mapFacade.mapChanged(
      target.getBounds(),
      target.getCenter(),
      target.getZoom()
    );
  }

  markerClick(marker: any) {
    this.mapFacade.clickOnMarker(marker.geometry.coordinates);
  }

  addControl(
    control: MapboxGl.Control | MapboxGl.IControl,
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  ) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.addControl(<any>control, position);
    });
  }

  removeControl(control: MapboxGl.Control | MapboxGl.IControl) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.removeControl(<any>control);
    });
  }

  fitScreenCoordinates(
    points: [MapboxGl.PointLike, MapboxGl.PointLike],
    bearing: number,
    options?: MapboxGl.AnimationOptions & MapboxGl.CameraOptions
  ) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.fitScreenCoordinates(
        points[0],
        points[1],
        bearing,
        options
      );
    });
  }

  move(
    movingMethod: 'jumpTo' | 'easeTo' | 'flyTo',
    movingOptions?: MovingOptions,
    zoom?: number,
    center?: MapboxGl.LngLatLike,
    bearing?: number,
    pitch?: number
  ) {
    return this.zone.runOutsideAngular(() => {
      (<any>this.mapInstance[movingMethod])({
        ...movingOptions,
        zoom: zoom != null ? zoom : this.mapInstance.getZoom(),
        center: center != null ? center : this.mapInstance.getCenter(),
        bearing: bearing != null ? bearing : this.mapInstance.getBearing(),
        pitch: pitch != null ? pitch : this.mapInstance.getPitch(),
      });
    });
  }

  panTo(center: MapboxGl.LngLatLike, options?: MapboxGl.AnimationOptions) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.panTo(center, options);
    });
  }

  fitBounds(
    bounds: MapboxGl.LngLatBoundsLike,
    options?: MapboxGl.FitBoundsOptions
  ) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.fitBounds(bounds, options);
    });
  }

  updateMaxBounds(maxBounds: MapboxGl.LngLatBoundsLike) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.setMaxBounds(maxBounds);
    });
  }

  updateStyle(style: MapboxGl.Style) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.setStyle(style);
    });
  }

  updateBoxZoom(status: boolean) {
    return this.zone.runOutsideAngular(() => {
      status
        ? this.mapInstance.boxZoom.enable()
        : this.mapInstance.boxZoom.disable();
    });
  }

  updateDragPan(status: boolean) {
    return this.zone.runOutsideAngular(() => {
      status
        ? this.mapInstance.dragPan.enable()
        : this.mapInstance.dragPan.disable();
    });
  }

  updateKeyboard(status: boolean) {
    return this.zone.runOutsideAngular(() => {
      status
        ? this.mapInstance.keyboard.enable()
        : this.mapInstance.keyboard.disable();
    });
  }

  updateDoubleClickZoom(status: boolean) {
    return this.zone.runOutsideAngular(() => {
      status
        ? this.mapInstance.doubleClickZoom.enable()
        : this.mapInstance.doubleClickZoom.disable();
    });
  }

  updateTouchZoomRotate(status: boolean) {
    return this.zone.runOutsideAngular(() => {
      status
        ? this.mapInstance.touchZoomRotate.enable()
        : this.mapInstance.touchZoomRotate.disable();
    });
  }

  updateTouchPitch(status: boolean) {
    return this.zone.runOutsideAngular(() => {
      status
        ? this.mapInstance.touchPitch.enable()
        : this.mapInstance.touchPitch.disable();
    });
  }

  updateDragRotate(status: boolean) {
    return this.zone.runOutsideAngular(() => {
      status
        ? this.mapInstance.dragRotate.enable()
        : this.mapInstance.dragRotate.disable();
    });
  }

  updateScrollZoom(status: boolean) {
    return this.zone.runOutsideAngular(() => {
      status
        ? this.mapInstance.scrollZoom.enable()
        : this.mapInstance.scrollZoom.disable();
    });
  }

  updateRenderWorldCopies(status: boolean) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.setRenderWorldCopies(status);
    });
  }

  updateMinZoom(minZoom: number) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.setMinZoom(minZoom);
    });
  }

  updateMaxZoom(maxZoom: number) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.setMaxZoom(maxZoom);
    });
  }

  updateMinPitch(minPitch: number) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.setMinPitch(minPitch);
    });
  }

  updateMaxPitch(maxPitch: number) {
    return this.zone.runOutsideAngular(() => {
      this.mapInstance.setMaxPitch(maxPitch);
    });
  }

  getSource<T extends MapboxGl.AnySourceImpl>(sourceId: string) {
    return <T>this.mapInstance.getSource(sourceId);
  }

  addSource(sourceId: string, source: MapboxGl.AnySourceData) {
    return this.zone.runOutsideAngular(() => {
      Object.keys(source).forEach(
        (key) => (<any>source)[key] === undefined && delete (<any>source)[key]
      );
      this.mapInstance.addSource(sourceId, source);
    });
  }

  removeSource(sourceId: string) {
    this.zone.runOutsideAngular(() => {
      this.findLayersBySourceId(sourceId).forEach((layer) =>
        this.mapInstance.removeLayer(layer.id)
      );
      this.mapInstance.removeSource(sourceId);
    });
  }

  private findLayersBySourceId(sourceId: string): MapboxGl.Layer[] {
    const layers = this.mapInstance.getStyle().layers;
    if (layers == null) {
      return [];
    }

    return layers.filter((l) =>
      'source' in l ? l.source === sourceId : false
    );
  }


  destroyMap() {
    if (this.mapInstance) {
      this.subscription.unsubscribe();
      this.mapInstance.remove();
    }
  }

}
