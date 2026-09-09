export type KakaoMap = {
  addControl: (control: unknown, position: unknown) => void;
  setCenter: (position: unknown) => void;
  relayout: () => void;
};

export type KakaoOverlay = {
  setMap: (map: KakaoMap | null) => void;
};

export type KakaoMapsApi = {
  Polyline: new (options: { map: KakaoMap; path: unknown[]; strokeWeight: number; strokeColor: string; strokeOpacity: number; strokeStyle: string; zIndex?: number; endArrow?: boolean }) => KakaoOverlay;
  load: (callback: () => void) => void;
  LatLng: new (latitude: number, longitude: number) => unknown;
  Map: new (container: HTMLElement, options: { center: unknown; level: number }) => KakaoMap;
  CustomOverlay: new (options: {
    map: KakaoMap;
    position: unknown;
    content: HTMLElement;
    xAnchor?: number;
    yAnchor: number;
    zIndex?: number;
  }) => KakaoOverlay;
  ZoomControl: new () => unknown;
  ControlPosition: { RIGHT: unknown };
};

type KakaoWindow = Window & { kakao?: { maps: KakaoMapsApi } };

let mapsPromise: Promise<KakaoMapsApi> | null = null;

export function loadKakaoMap(appKey: string) {
  const kakaoWindow = window as KakaoWindow;
  if (kakaoWindow.kakao?.maps) {
    return new Promise<KakaoMapsApi>(resolve => {
      kakaoWindow.kakao!.maps.load(() => resolve(kakaoWindow.kakao!.maps));
    });
  }
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<KakaoMapsApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src*="dapi.kakao.com/v2/maps/sdk.js"]');
    if (existing) {
      reject(new Error('Kakao 지도 SDK 인증에 실패했습니다. JavaScript 키, 지도 사용 권한, 등록 도메인을 확인해 주세요.'));
      return;
    }
    const script = document.createElement('script');

    const handleLoad = () => {
      if (!kakaoWindow.kakao?.maps) {
        reject(new Error('Kakao 지도 SDK 인증에 실패했습니다. JavaScript 키와 지도 사용 권한을 확인해 주세요.'));
        return;
      }
      kakaoWindow.kakao.maps.load(() => resolve(kakaoWindow.kakao!.maps));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', () => reject(new Error('Kakao 지도 SDK를 불러오지 못했습니다.')), { once: true });

    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.async = true;
    document.head.appendChild(script);
  });

  return mapsPromise;
}
