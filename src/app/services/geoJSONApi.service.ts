import { Injectable } from "@angular/core";
import { Map, LngLatLike, LngLatBounds } from "mapbox-gl";
import { HttpClient } from "@angular/common/http";

@Injectable()
export class geoJSONApiService {

  constructor(
    private httpClient: HttpClient
  ) {}

  get(bbox: LngLatBounds) {
    return this.httpClient.get(
      'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/houston.geojson'
    );
  }
}
