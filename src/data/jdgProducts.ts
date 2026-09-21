import emblemAsset from "@/assets/jdg/emblem.png.asset.json";
import teeWhiteAsset from "@/assets/jdg/rebirth-tee-white.png.asset.json";
import teeBlackAsset from "@/assets/jdg/rebirth-tee-black.png.asset.json";
import teeBlueAsset from "@/assets/jdg/rebirth-tee-blue.png.asset.json";
import teeBurgundyAsset from "@/assets/jdg/rebirth-tee-burgundy.png.asset.json";
import teeGreenAsset from "@/assets/jdg/rebirth-tee-green.png.asset.json";
import sleevelessWhiteAsset from "@/assets/jdg/paneled-sleeveless-white.png.asset.json";
import sleevelessBlackAsset from "@/assets/jdg/paneled-sleeveless-black.png.asset.json";
import sleevelessBlueAsset from "@/assets/jdg/paneled-sleeveless-blue.webp.asset.json";
import sleevelessGreenAsset from "@/assets/jdg/paneled-sleeveless-green.webp.asset.json";

export type JdgCategory = "T-Shirts" | "Sleeveless Tops";

export interface JdgColorway {
  name: string;
  swatch: string;
  image: string;
  imageAlt: string;
}

export interface JdgProduct {
  slug: string;
  name: string;
  category: JdgCategory;
  tagline: string;
  description?: string;
  story?: string;
  price?: string;
  sizes?: string[];
  availability?: string;
  purchaseUrl?: string;
  colorways: JdgColorway[];
}

export const jdgEmblemUrl = emblemAsset.url;

export const jdgProducts: JdgProduct[] = [
  {
    slug: "rebirth-emblem-t-shirt",
    name: "JDG Rebirth Emblem T-Shirt",
    category: "T-Shirts",
    tagline: "The signature emblem, carried front and back.",
    colorways: [
      { name: "White", swatch: "bg-jdg-bone", image: teeWhiteAsset.url, imageAlt: "White JDG Rebirth Emblem T-Shirt, front and back" },
      { name: "Black", swatch: "bg-jdg-ink border-jdg-muted", image: teeBlackAsset.url, imageAlt: "Black JDG Rebirth Emblem T-Shirt, front and back" },
      { name: "Royal Blue", swatch: "bg-jdg-blue", image: teeBlueAsset.url, imageAlt: "Royal blue JDG Rebirth Emblem T-Shirt, front and back" },
      { name: "Burgundy", swatch: "bg-jdg-burgundy", image: teeBurgundyAsset.url, imageAlt: "Burgundy JDG Rebirth Emblem T-Shirt, front and back" },
      { name: "Forest Green", swatch: "bg-jdg-forest", image: teeGreenAsset.url, imageAlt: "Forest green JDG Rebirth Emblem T-Shirt, front and back" },
    ],
  },
  {
    slug: "paneled-sleeveless-top",
    name: "JDG Paneled Sleeveless Top",
    category: "Sleeveless Tops",
    tagline: "A clean silhouette defined by its double side panel.",
    colorways: [
      { name: "White / Gold", swatch: "bg-jdg-bone", image: sleevelessWhiteAsset.url, imageAlt: "White and gold JDG paneled sleeveless top" },
      { name: "Black / Gold", swatch: "bg-jdg-ink border-jdg-muted", image: sleevelessBlackAsset.url, imageAlt: "Black and gold JDG paneled sleeveless top" },
      { name: "Royal Blue / Cream", swatch: "bg-jdg-blue", image: sleevelessBlueAsset.url, imageAlt: "Royal blue and cream JDG paneled sleeveless top" },
      { name: "Forest Green / Cream", swatch: "bg-jdg-forest", image: sleevelessGreenAsset.url, imageAlt: "Forest green and cream JDG paneled sleeveless top" },
    ],
  },
];

export const jdgCategories = Array.from(new Set(jdgProducts.map((product) => product.category)));

export const getJdgProduct = (slug?: string) => jdgProducts.find((product) => product.slug === slug);