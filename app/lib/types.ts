export type Celeb = {
  id: number;
  name: string;
  englishName: string;
  group: string;
  emoji: string;
  logo: string;
  logoScale: number;
  gradient: string;
};

export type Restaurant = {
  english?: { name?: string | null; address?: string | null; hours?: string | null; category?: string | null };
  id: number;
  name: string;
  category: string;
  distance: string;
  rating: number;
  reviewCount: number;
  recom: string[];
  location: string;
  latitude: number | null;
  longitude: number | null;
  hours: string;
  breakTime?: string | null;
  priceRange: string;
  tags: string[];
  liked: boolean;
  colorFrom: string;
  colorTo: string;
};
