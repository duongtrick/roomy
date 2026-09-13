import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { colors, radius } from "@/theme";

/**
 * Bản đồ nền cho toàn app, chạy bằng Leaflet trong WebView.
 *
 * Lý do không dùng `react-native-maps`: trên Android nó luôn render qua Google
 * Maps SDK, mà SDK đó bắt buộc có API key — thiếu key là bản release hiện ô
 * xám. Leaflet + tile OpenStreetMap không cần key, không cần tài khoản.
 *
 * Tile lấy từ CARTO "Voyager": vẫn là dữ liệu OSM nhưng bảng màu và cách đánh
 * nhãn gần với Google Maps hơn tile OSM gốc, nên nhìn quen mắt hơn với người
 * dùng Việt Nam.
 *
 * Trang HTML là hằng số, không phụ thuộc props — mọi thay đổi (đổi ghim, đổi
 * marker đang chọn) được đẩy sang bằng `injectJavaScript`. Nếu nhúng props vào
 * HTML thì mỗi lần state đổi WebView sẽ tải lại từ đầu và bản đồ giật về vị trí
 * ban đầu.
 */

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
};

type Props = {
  markers?: MapMarker[];
  /** Marker đang chọn — được phóng to và bay tới khi đổi. */
  activeId?: string | null;
  center?: { lat: number; lng: number };
  zoom?: number;
  /** Bấm vào marker. */
  onSelect?: (id: string) => void;
  /** Có truyền là bật chế độ ghim: chạm lên bản đồ để đặt toạ độ. */
  onPick?: (lat: number, lng: number) => void;
  /** `false` cho bản đồ tĩnh (không kéo, không zoom). */
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Toạ độ mặc định: trung tâm Thái Nguyên. */
const FALLBACK_CENTER = { lat: 21.5905, lng: 105.8375 };

const HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
  body { background: ${colors.tint100}; }
  .leaflet-container { background: ${colors.tint100}; font-family: sans-serif; }
  /* Nhãn ghi công bắt buộc theo giấy phép OSM/CARTO, nhưng thu nhỏ cho đỡ choán. */
  .leaflet-control-attribution { font-size: 9px; background: rgba(255,255,255,0.75); }
  .roomy-pin { transition: transform 120ms ease-out; transform-origin: 50% 100%; }
  .roomy-pin.active { transform: scale(1.35); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var send = function (payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  };

  var map = null;
  var markerLayer = {};
  var pinMarker = null;
  var activeId = null;
  var pickable = false;

  // Cùng hình MapPin của lucide dùng trong app, để bản đồ và phần còn lại của
  // giao diện trông là một.
  function pinHtml(active) {
    var size = active ? 40 : 30;
    return (
      '<div class="roomy-pin' + (active ? ' active' : '') + '">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" ' +
      'fill="${colors.primary}" stroke="#FFFFFF" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>' +
      '<circle cx="12" cy="10" r="3" fill="#FFFFFF" stroke="none"/>' +
      '</svg></div>'
    );
  }

  function icon(active) {
    var size = active ? 40 : 30;
    return L.divIcon({
      html: pinHtml(active),
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size]
    });
  }

  window.__roomy = {
    init: function (cfg) {
      if (map) return;
      map = L.map('map', {
        zoomControl: false,
        attributionControl: true,
        dragging: cfg.interactive,
        scrollWheelZoom: cfg.interactive,
        doubleClickZoom: cfg.interactive,
        touchZoom: cfg.interactive,
        boxZoom: false,
        keyboard: false,
        tap: cfg.interactive
      }).setView([cfg.center.lat, cfg.center.lng], cfg.zoom);

      var retina = window.devicePixelRatio > 1 ? '@2x' : '';
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + retina + '.png',
        {
          subdomains: 'abcd',
          maxZoom: 20,
          attribution: '&copy; OpenStreetMap &copy; CARTO'
        }
      ).addTo(map);

      pickable = !!cfg.pickable;
      if (pickable) {
        map.on('click', function (e) {
          send({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng });
        });
      }
    },

    setMarkers: function (list, nextActiveId) {
      if (!map) return;
      activeId = nextActiveId;
      var seen = {};
      list.forEach(function (m) {
        seen[m.id] = true;
        var isActive = m.id === activeId;
        var existing = markerLayer[m.id];
        if (existing) {
          existing.setLatLng([m.lat, m.lng]);
          existing.setIcon(icon(isActive));
          existing.setZIndexOffset(isActive ? 1000 : 0);
        } else {
          var marker = L.marker([m.lat, m.lng], {
            icon: icon(isActive),
            zIndexOffset: isActive ? 1000 : 0,
            title: m.title
          }).addTo(map);
          marker.on('click', function () {
            send({ type: 'select', id: m.id });
          });
          markerLayer[m.id] = marker;
        }
      });
      Object.keys(markerLayer).forEach(function (id) {
        if (!seen[id]) {
          map.removeLayer(markerLayer[id]);
          delete markerLayer[id];
        }
      });
    },

    setPin: function (lat, lng) {
      if (!map) return;
      if (lat === null || lng === null) {
        if (pinMarker) { map.removeLayer(pinMarker); pinMarker = null; }
        return;
      }
      if (pinMarker) {
        pinMarker.setLatLng([lat, lng]);
      } else {
        pinMarker = L.marker([lat, lng], { icon: icon(true) }).addTo(map);
      }
    },

    flyTo: function (lat, lng, zoom) {
      if (!map) return;
      map.flyTo([lat, lng], zoom || map.getZoom(), { duration: 0.6 });
    }
  };

  send({ type: 'ready' });
})();
</script>
</body>
</html>`;

export function LeafletMap({
  markers,
  activeId = null,
  center,
  zoom = 14,
  onSelect,
  onPick,
  interactive = true,
  style,
}: Props) {
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  // Bản đồ chỉ có một ghim (màn ghim vị trí) truyền `markers` một phần tử; khi
  // đó chính nó là cái ghim di chuyển theo mỗi lần chạm.
  const pinOnly = !!onPick;

  const run = useCallback((js: string) => {
    webRef.current?.injectJavaScript(`${js}; true;`);
  }, []);

  const initialCenter = useMemo(() => {
    if (center) return center;
    const first = markers?.[0];
    return first ? { lat: first.lat, lng: first.lng } : FALLBACK_CENTER;
  }, [center, markers]);

  /** Đẩy toàn bộ trạng thái hiện tại sang trang — dùng lúc trang báo sẵn sàng. */
  const pushAll = useCallback(() => {
    run(
      `window.__roomy.init(${JSON.stringify({
        center: initialCenter,
        zoom,
        interactive,
        pickable: pinOnly,
      })})`,
    );
    if (markers?.length) {
      run(`window.__roomy.setMarkers(${JSON.stringify(markers)}, ${JSON.stringify(activeId)})`);
    }
  }, [run, initialCenter, zoom, interactive, pinOnly, markers, activeId]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: { type?: string; id?: string; lat?: number; lng?: number };
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (msg.type === "ready") {
        setLoading(false);
        pushAll();
        return;
      }
      if (msg.type === "select" && msg.id && onSelect) {
        onSelect(msg.id);
        return;
      }
      if (msg.type === "pick" && msg.lat != null && msg.lng != null && onPick) {
        onPick(msg.lat, msg.lng);
      }
    },
    [pushAll, onSelect, onPick],
  );

  // Marker/ghim đổi sau khi trang đã sẵn sàng thì đẩy bản cập nhật, không tải lại.
  // Mảng `markers` là literal mới mỗi lần render, nên deps so sánh trên chuỗi
  // đã tuần tự hoá — dùng thẳng mảng sẽ chạy lại effect ở mọi render.
  const markerKey = JSON.stringify(markers ?? []);

  useEffect(() => {
    if (loading || !markerKey || markerKey === "[]") return;
    run(`window.__roomy.setMarkers(${markerKey}, ${JSON.stringify(activeId)})`);
  }, [loading, markerKey, activeId, run]);

  // Bay tới marker đang chọn.
  useEffect(() => {
    if (loading || !activeId) return;
    const list = JSON.parse(markerKey) as MapMarker[];
    const target = list.find((m) => m.id === activeId);
    if (target) run(`window.__roomy.flyTo(${target.lat}, ${target.lng})`);
  }, [loading, activeId, markerKey, run]);

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        source={{ html: HTML, baseUrl: "https://localhost" }}
        originWhitelist={["*"]}
        style={styles.web}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        scrollEnabled={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        // Bản đồ tĩnh không nhận thao tác nào, kể cả cuộn nhầm khi lướt trang.
        pointerEvents={interactive ? "auto" : "none"}
      />
      {loading ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderRadius: radius["3xl"],
    backgroundColor: colors.tint100,
  },
  web: { flex: 1, backgroundColor: "transparent" },
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
