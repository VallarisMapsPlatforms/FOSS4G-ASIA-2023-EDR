"use client";

import { useEffect, useState } from "react";
import * as CovJSON from "covjson-reader";
import { JsonViewer } from "@textea/json-viewer";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import bboxPolygon from "@turf/bbox-polygon";

const BboxPage = () => {
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
          const xmin = Math.min(...domain.axes.get("x").values);
          const xmax = Math.max(...domain.axes.get("x").values);
          const ymin = Math.min(...domain.axes.get("y").values);
          const ymax = Math.max(...domain.axes.get("y").values);

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
          const bboxCovjaon = bboxPolygon([xmin, ymin, xmax, ymax]);
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

export default BboxPage;
