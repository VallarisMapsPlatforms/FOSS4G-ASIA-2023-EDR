"use client";

import { useCallback, useEffect } from "react";
import * as CovJSON from "covjson-reader";
import ColorScale from "color-scales";
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-gl-compare-ts/dist/style.css";
import bboxPolygon from "@turf/bbox-polygon";
import { hexToRgb } from "@/util";
import { Compare } from "maplibre-gl-compare-ts";
import { Feature, FeatureCollection } from "geojson";

const ComparePage = () => {
  const loadCovJson = useCallback((rasterMap: Map, vectorMap: Map) => {
    CovJSON.read("example-data/outdata4.json")
      .then(async (cov: any) => {
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
        const colorScale = new ColorScale(0, 100, ["#ff0000", "#00ff00"], 1);
        rasterMap.on("load", () => {
          rasterMap.fitBounds(
            [
              [xmin, ymin],
              [xmax, ymax],
            ],
            {
              padding: { top: 50, left: 50, right: 50, bottom: 50 },
              animate: false,
            }
          );
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
            rasterMap.addSource("covjson-source", {
              type: "image",
              url: imageURL as string,
              coordinates: [
                [xmin, ymax],
                [xmax + pixelWidth, ymax],
                [xmax + pixelWidth, ymin - pixelHeight],
                [xmin, ymin - pixelHeight],
              ],
            });
            rasterMap.addLayer({
              id: "covjson-layer",
              type: "raster",
              source: "covjson-source",
              paint: { "raster-resampling": "nearest" },
            });
          }
        });
        vectorMap.on("load", () => {
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
          vectorMap.addLayer({
            id: "covjson-geojson",
            type: "fill",
            source: { type: "geojson", data: CovGeojson, tolerance: 0.1 },
            paint: { "fill-color": ["get", "color"] },
          });
        });
      })
      .catch((e: any) => {
        // there was an error when loading the coverage
        console.log(e);
      });
  }, []);

  useEffect(() => {
    const mapRaster = new Map({
      container: "raster",
      style: process.env.NEXT_PUBLIC_MAP_STYLE as string,
    });
    const mapVector = new Map({
      container: "vector",
      style: process.env.NEXT_PUBLIC_MAP_STYLE as string,
    });
    const map = new Compare(
      mapRaster as any,
      mapVector as any,
      "#comparison-container"
    );
    loadCovJson(mapRaster, mapVector);

    return () => {
      map.remove();
    };
  }, [loadCovJson]);

  return (
    <div id="comparison-container">
      <div id="raster" className="absolute h-screen w-full"></div>
      <div id="vector" className="absolute h-screen w-full"></div>
    </div>
  );
};

export default ComparePage;
