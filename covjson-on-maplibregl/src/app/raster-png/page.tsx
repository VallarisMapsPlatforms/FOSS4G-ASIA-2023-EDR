"use client";

import { useEffect, useState } from "react";
import * as CovJSON from "covjson-reader";
import { JsonViewer } from "@textea/json-viewer";
import ColorScale from "color-scales";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import bboxPolygon from "@turf/bbox-polygon";
import { hexToRgb } from "@/util";

const RasterPng = () => {
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
              [xmin, ymin],
              [xmax, ymax],
            ],
            {
              padding: { top: 50, left: 50, right: 50, bottom: 50 },
              animate: false,
            }
          );

          const colorScale = new ColorScale(0, 100, ["#ddeaf6", "#3182bd"], 1);
          const dataToColor = range._ndarr.data.map(
            (value: number, i: number) => {
              if (value) {
                const range = maxValue - minValue;
                const correctedStartValue = value - minValue;
                const percentage = (correctedStartValue * 100) / range; //value / (maxValue - minValue);
                return colorScale.getColor(percentage).toHexString();
              } else {
                return "#ffffff";
              }
            }
          );

          const c = document.createElement("canvas");
          c.setAttribute("width", countRow);
          c.setAttribute("height", countColumn);
          const ctx = c.getContext("2d");
          if (ctx) {
            // Create ImageData object to manipulate pixel data
            const imageData = ctx.createImageData(countRow, countColumn);

            // Set pixel data from the hex color array
            for (let i = 0; i < dataToColor.length; i++) {
              const rgbArray = hexToRgb(dataToColor[i]);
              const pixelIndex = i * 4; // Each pixel has 4 values (RGBA)

              // Set RGBA values
              imageData.data[pixelIndex] = rgbArray.r;
              imageData.data[pixelIndex + 1] = rgbArray.g;
              imageData.data[pixelIndex + 2] = rgbArray.b;
              imageData.data[pixelIndex + 3] =
                dataToColor[i] === "#ffffff" ? 0 : 255; // Alpha value (255 is fully opaque)
            }
            ctx.putImageData(imageData, 0, 0);
            const imageURL = c.toDataURL();
            c.remove();
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
            event.target.addSource("covjson-source", {
              type: "image",
              url: imageURL as string,
              coordinates: [
                [xmin, ymax],
                [xmax + pixelWidth, ymax],
                [xmax + pixelWidth, ymin - pixelHeight],
                [xmin, ymin - pixelHeight],
              ],
            });
            event.target.addLayer({
              id: "covjson-layer",
              type: "raster",
              source: "covjson-source",
              paint: { "raster-resampling": "nearest" },
            });
          }
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

export default RasterPng;
