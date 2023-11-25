import Link from "next/link";

const listPages = [
  { link: "/bbox", title: "Bounding box of CoverageJSON" },
  { link: "/raster-png", title: "Raster Image(.PNG)" },
  { link: "/vector-geojson", title: "Vector GeoJSON" },
  { link: "/compare", title: "Compare between Raster Image & Vector GeoJSON" },
];

export default function Home() {
  return (
    <div className="container  mx-auto pt-8">
      <h1 className="font-semibold text-xl">
        List of rendering CoverageJSON example
      </h1>
      <ul className="mt-4 ml-8">
        {listPages.map((page, i) => (
          <li key={page.link} className="font-light text-lg pt-2 pb-2">
            <Link href={page.link}>{`${i + 1} - ${page.title}`}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
