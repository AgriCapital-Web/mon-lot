export type LotStatus = "disponible" | "reserve" | "vendu" | "a_confirmer";

export const STATUS_LABEL: Record<LotStatus, string> = {
  disponible: "Disponible",
  reserve: "Réservé",
  vendu: "Vendu",
  a_confirmer: "À confirmer",
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
  /** Fiche de présentation du catalogue, sans transaction tant que les informations ne sont pas confirmées. */
  is_catalogue_preview?: boolean;
};

export const PUBLIC_LOT_COLUMNS =
  "id, reference, title, city, area_name, region, area_sqm, cash_price, status, cover_image_url, gallery_urls, description, access_details, documents, latitude, longitude, is_featured, featured_priority";
