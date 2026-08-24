import RestaurantLocationMap from '../../../components/RestaurantLocationMap';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RestaurantMapPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);

  return (
    <RestaurantLocationMap
      restaurantId={id}
      name={first(query.name) ?? '맛집'}
      address={first(query.address) ?? '주소 정보 없음'}
      latitude={Number(first(query.latitude))}
      longitude={Number(first(query.longitude))}
    />
  );
}
