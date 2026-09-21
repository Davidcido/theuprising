import emblemImage from "@/assets/jdg/emblem-transparent.png";
import teeWhiteAsset from "@/assets/jdg/rebirth-tee-white.png.asset.json";
import teeBlackAsset from "@/assets/jdg/rebirth-tee-black.png.asset.json";
import teeBlueAsset from "@/assets/jdg/rebirth-tee-blue.png.asset.json";
import teeBurgundyAsset from "@/assets/jdg/rebirth-tee-burgundy.png.asset.json";
import teeGreenAsset from "@/assets/jdg/rebirth-tee-green.png.asset.json";
import sleevelessWhiteAsset from "@/assets/jdg/paneled-sleeveless-white.png.asset.json";
import sleevelessBlackAsset from "@/assets/jdg/paneled-sleeveless-black.png.asset.json";
import sleevelessBlueAsset from "@/assets/jdg/paneled-sleeveless-blue.webp.asset.json";
import sleevelessGreenAsset from "@/assets/jdg/paneled-sleeveless-green.webp.asset.json";
import cropTopWhiteAsset from "@/assets/jdg/crop-top-white.png.asset.json";
import cropTopBlackAsset from "@/assets/jdg/crop-top-black.png.asset.json";
import cropTopBlueAsset from "@/assets/jdg/crop-top-blue.png.asset.json";
import cropTopBurgundyAsset from "@/assets/jdg/crop-top-burgundy.png.asset.json";
import cropTopGreenAsset from "@/assets/jdg/crop-top-green.png.asset.json";
import beanieAsset from "@/assets/jdg/black-emblem-beanie.png.asset.json";

export type JdgCategory =
  | "New Arrivals"
  | "T-Shirts"
  | "Hoodies"
  | "Outerwear"
  | "Bottoms"
  | "Accessories"
  | "Limited Editions"
  | "Sleeveless Tops"
  | "Tops";

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

export const jdgEmblemUrl = emblemImage;

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
  {
    slug: "cropped-panel-top",
    name: "JDG Cropped Panel Top",
    category: "Tops",
    tagline: "A fitted shape cut for movement, traced with contrast panels.",
    colorways: [
      { name: "White / Gold", swatch: "bg-jdg-bone", image: cropTopWhiteAsset.url, imageAlt: "White and gold JDG cropped panel top on a mannequin" },
      { name: "Black / Gold", swatch: "bg-jdg-ink border-jdg-muted", image: cropTopBlackAsset.url, imageAlt: "Black and gold JDG cropped panel top on a mannequin" },
      { name: "Royal Blue / Cream", swatch: "bg-jdg-blue", image: cropTopBlueAsset.url, imageAlt: "Royal blue and cream JDG cropped panel top on a mannequin" },
      { name: "Burgundy / Cream", swatch: "bg-jdg-burgundy", image: cropTopBurgundyAsset.url, imageAlt: "Burgundy and cream JDG cropped panel top on a mannequin" },
      { name: "Forest Green / Cream", swatch: "bg-jdg-forest", image: cropTopGreenAsset.url, imageAlt: "Forest green and cream JDG cropped panel top on a mannequin" },
    ],
  },
  {
    slug: "rebirth-emblem-beanie",
    name: "JDG Rebirth Emblem Beanie",
    category: "Accessories",
    tagline: "The emblem, stitched for colder mornings.",
    colorways: [
      { name: "Black / Gold", swatch: "bg-jdg-ink border-jdg-muted", image: beanieAsset.url, imageAlt: "Black JDG beanie with gold rebirth emblem" },
    ],
  },
];

export const jdgCategories = Array.from(new Set(jdgProducts.map((product) => product.category)));

export const getJdgProduct = (slug?: string) => jdgProducts.find((product) => product.slug === slug);
