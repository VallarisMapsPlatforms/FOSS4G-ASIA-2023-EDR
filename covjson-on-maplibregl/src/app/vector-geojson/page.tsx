"use client";

import { useEffect, useState } from "react";
import * as CovJSON from "covjson-reader";
import { JsonViewer } from "@textea/json-viewer";
import ColorScale from "color-scales";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import bboxPolygon from "@turf/bbox-polygon";
import { Feature, FeatureCollection } from "geojson";

const VectorGeojson = () => {
  const [covjson, setcovjson] = useState(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: "map-container",
      style: process.env.NEXT_PUBLIC_MAP_STYLE as string,
    });

    map.once("load", (event: maplibregl.MapEventType["load"]) => {
      CovJSON.read("example-data/outdata3.json")
        .then(async (cov: any) => {
          // work with Coverage object
          setcovjson(cov);
          const domain = await cov.loadDomain();
          const range: any = await cov.loadRange("data");
          //   console.log(domain.axes.get("x").values);
          const xAxesValues = domain.axes.get("x").values;
          const yAxesValues = domain.axes.get("y").values;
          const rawData = range._ndarr.data;

          const countRow = xAxesValues.length;
          const countColumn = yAxesValues.length;
          const minValue = Math.min(...rawData);
          const maxValue = Math.max(...rawData);

          const xmin = Math.min(...xAxesValues);
          const xmax = Math.max(...xAxesValues);
          const ymin = Math.min(...yAxesValues);
          const ymax = Math.max(...yAxesValues);

          const pixelWidth = (xmax - xmin) / countRow;
          const pixelHeight = (ymax - ymin) / countColumn;

          event.target.fitBounds(
            [
              [xmin, ymin - pixelHeight],
              [xmax + pixelWidth, ymax],
            ],
            {
              padding: { top: 50, left: 50, right: 50, bottom: 50 },
              animate: false,
            }
          );

          const colorScale = new ColorScale(0, 100, ["#ddeaf6", "#3182bd"], 1);

          const CovGeojson: FeatureCollection = {
            type: "FeatureCollection",
            features: [],
          };
          for (let yIndex = 0; yIndex < countColumn; yIndex++) {
            for (let xIndex = 0; xIndex < countRow; xIndex++) {
              const value = rawData[yIndex * countRow + xIndex];
              if (value) {
                const featureBbox = [
                  xAxesValues[xIndex],
                  yAxesValues[yIndex],
                  xAxesValues[xIndex] + pixelWidth,
                  yAxesValues[yIndex] - pixelHeight,
                ];
                const range = maxValue - minValue;
                const correctedStartValue = value - minValue;
                const percentage = (correctedStartValue * 100) / range; //value / (maxValue - minValue);
                const feature: Feature = bboxPolygon(featureBbox, {
                  properties: {
                    value,
                    color: colorScale.getColor(percentage).toHexString(),
                  },
                });
                CovGeojson.features.push(feature);
              }
            }
          }
          event.target.addLayer({
            id: "covjson-geojson",
            type: "fill",
            source: { type: "geojson", data: CovGeojson },
            paint: { "fill-color": ["get", "color"] },
          });

          const bboxCovjaon = bboxPolygon([
            xmin,
            ymin - pixelHeight,
            xmax + pixelWidth,
            ymax,
          ]);
          event.target.addLayer({
            id: "covjson-bbox",
            type: "line",
            source: { type: "geojson", data: bboxCovjaon },
            paint: { "line-color": "#ff0000" },
          });
        })
        .catch((e: any) => {
          // there was an error when loading the coverage
          console.log(e);
        });
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <main className="h-screen w-screen flex">
      <div className="w-1/2 h-full overflow-y-auto">
        <JsonViewer value={covjson} theme="dark" />
      </div>
      <div id="map-container" className="w-1/2 h-full"></div>
    </main>
  );
};

export default VectorGeojson;
