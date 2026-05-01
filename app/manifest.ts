import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Advokat Turdimotov — Admin Panel",
    short_name: "Advokat Admin",
    description: "Advokat boshqaruv tizimi: bronlar, to'lovlar, mijoz suhbatlari",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "uz",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon0",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png"
      }
    ],
    shortcuts: [
      {
        name: "Navbat",
        short_name: "Navbat",
        url: "/requests",
        description: "Aktiv qabul so'rovlari"
      },
      {
        name: "To'lovlar",
        short_name: "To'lovlar",
        url: "/payments",
        description: "Tasdiqlash kutilayotgan to'lovlar"
      },
      {
        name: "Mijoz suhbati",
        short_name: "Suhbat",
        url: "/conversations",
        description: "AI suhbatlar va mijoz savollari"
      }
    ]
  };
}
