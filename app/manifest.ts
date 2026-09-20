import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Character Studio",
    short_name: "Character Studio",
    description: "Character, image and video generation workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#16181d",
    orientation: "any",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
