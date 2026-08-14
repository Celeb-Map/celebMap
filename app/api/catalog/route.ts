import { createClient } from '@supabase/supabase-js';
import type { Restaurant } from '../../lib/types';

type CelebrityRow = {
  id: number;
  name_ko: string | null;
  name_en: string | null;
  group_name: string | null;
};

type RestaurantRow = {
  id: number;
  name_ko: string | null;
  category: string | null;
  address: string | null;
  business_hours: string | null;
  status: string | null;
  notes: string | null;
};

type RecommendationRow = {
  celebrity_id: number | null;
  restaurant_id: number | null;
};

const GROUPS = [
  { name: '블랙핑크', aliases: ['블랙핑크', 'blackpink'] },
  { name: '세븐틴', aliases: ['세븐틴', 'seventeen'] },
  { name: 'BTS', aliases: ['bts', '방탄소년단'] },
  { name: '스트레이키즈', aliases: ['스트레이키즈', '스트레이 키즈', 'straykids', 'stray kids', '스키즈'] },
  { name: '코르티스', aliases: ['코르티스', 'cortis'] },
  { name: 'GD', aliases: ['gd', 'g-dragon', 'gdragon', '지드래곤', '권지용'] },
] as const;

function identifyGroup(celebrity: CelebrityRow) {
  const haystack = [celebrity.name_ko, celebrity.name_en, celebrity.group_name]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();

  return GROUPS.find(group => group.aliases.some(alias => haystack.includes(alias.toLocaleLowerCase())))?.name;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return Response.json({ message: 'Supabase 환경 변수가 설정되지 않았습니다.' }, { status: 500 });
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [celebritiesResult, restaurantsResult, recommendationsResult] = await Promise.all([
    supabase.from('celebrities').select('id, name_ko, name_en, group_name'),
    supabase.from('restaurant').select('id, name_ko, category, address, business_hours, status, notes').order('id'),
    supabase.from('celebrity_restaurants').select('celebrity_id, restaurant_id'),
  ]);

  const error = celebritiesResult.error ?? restaurantsResult.error ?? recommendationsResult.error;
  if (error) {
    return Response.json({ message: `맛집 데이터를 불러오지 못했습니다: ${error.message}` }, { status: 502 });
  }

  const celebrities = (celebritiesResult.data ?? []) as CelebrityRow[];
  const recommendations = (recommendationsResult.data ?? []) as RecommendationRow[];
  const groupByCelebrityId = new Map<number, string>();
  celebrities.forEach(celebrity => {
    const group = identifyGroup(celebrity);
    if (group) groupByCelebrityId.set(celebrity.id, group);
  });

  const groupsByRestaurantId = new Map<number, Set<string>>();
  recommendations.forEach(recommendation => {
    if (recommendation.celebrity_id === null || recommendation.restaurant_id === null) return;
    const group = groupByCelebrityId.get(recommendation.celebrity_id);
    if (!group) return;
    const groups = groupsByRestaurantId.get(recommendation.restaurant_id) ?? new Set<string>();
    groups.add(group);
    groupsByRestaurantId.set(recommendation.restaurant_id, groups);
  });

  const restaurants: Restaurant[] = ((restaurantsResult.data ?? []) as RestaurantRow[])
    .map((restaurant, index) => ({
      id: restaurant.id,
      name: restaurant.name_ko ?? '이름 없는 맛집',
      category: restaurant.category ?? '맛집',
      distance: '주소 확인',
      rating: 0,
      reviewCount: 0,
      recom: [...(groupsByRestaurantId.get(restaurant.id) ?? [])],
      location: restaurant.address ?? '주소 정보 없음',
      hours: restaurant.business_hours ?? '영업시간 정보 없음',
      breakTime: null,
      priceRange: '',
      tags: [restaurant.status, restaurant.notes].filter((value): value is string => Boolean(value)),
      liked: false,
      colorFrom: index % 2 === 0 ? 'from-plum-300' : 'from-plum-400',
      colorTo: index % 3 === 0 ? 'to-neon-100' : 'to-plum-50',
    }))
    .filter(restaurant => restaurant.recom.length > 0);

  return Response.json({ restaurants });
}
