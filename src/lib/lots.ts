export type LotStatus = "disponible" | "reserve" | "vendu";

export const STATUS_LABEL: Record<LotStatus, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  vendu: "Vendu",
};

export type PublicLot = {
  id: string;
  reference: string;
  title: string;
  city: string;
  area_name: string;
  region: string | null;
  area_sqm: number;
  cash_price: number;
  status: LotStatus;
  cover_image_url: string;
  gallery_urls: string[];
  description: string;
  access_details: string | null;
  documents: string[];
  latitude: number | null;
  longitude: number | null;
  is_featured: boolean;
  featured_priority: number | null;
  /** Données fictives utilisées uniquement pour illustrer la plateforme. */
  is_demo?: boolean;
};

export const PUBLIC_LOT_COLUMNS =
  "id, reference, title, city, area_name, region, area_sqm, cash_price, status, cover_image_url, gallery_urls, description, access_details, documents, latitude, longitude, is_featured, featured_priority";
