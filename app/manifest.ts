import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Character Studio",
    short_name: "Character Studio",
    description: "Create and manage AI characters.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#16181d",
    orientation: "portrait-primary",
    icons: [],
  };
}
