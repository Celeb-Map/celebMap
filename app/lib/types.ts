export type Celeb = {
  id: number;
  name: string;
  group: string;
  emoji: string;
  gradient: string;
};

export type Restaurant = {
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
