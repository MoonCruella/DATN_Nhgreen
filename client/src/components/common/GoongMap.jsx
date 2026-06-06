import React, { useEffect, useRef, useState } from "react";

// Lightweight loader for Goong JS via CDN
const GOONG_JS =
  "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@3.2.0/dist/goong-js.js";
const GOONG_CSS =
  "https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@3.2.0/dist/goong-js.css";

function ensureCssInjected() {
  if (document.querySelector(`link[href='${GOONG_CSS}']`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = GOONG_CSS;
  document.head.appendChild(link);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src='${src}']`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      if (window.goongjs) return resolve();
      return; // wait for onload
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.body.appendChild(s);
  });
}

const normalizeLngLat = (value) => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const lng = Number(value[0]);
  const lat = Number(value[1]);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  return [lng, lat];
};

const GoongMap = ({
  apiKey = import.meta.env.VITE_GOONG_MAP_KEY,
  center = [106.700981, 10.776889], // [lng, lat]
  zoom = 13,
  markers = [], // [{ lng, lat, title }]
  className = "w-full h-full",
  fallback = true, // render iframe fallback on error
}) => {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!apiKey) return; // caller may fallback to iframe outside
    ensureCssInjected();
    let mapInstance;
    let timeoutId;
    let isMounted = true;
    let didLoad = false;
    const initialCenter = normalizeLngLat(center) || [106.700981, 10.776889];

    setReady(false);
    setFailed(false);

    loadScript(GOONG_JS)
      .then(() => {
        if (!isMounted || !window.goongjs || !containerRef.current) return;
        window.goongjs.accessToken = apiKey;
        mapInstance = new window.goongjs.Map({
          container: containerRef.current,
          style: "https://tiles.goong.io/assets/goong_map_web.json",
          center: initialCenter,
          zoom: zoom,
        });
        const handleLoad = () => {
          if (!isMounted) return;
          didLoad = true;
          setFailed(false);
          mapInstance.resize();
          console.log("[GoongMap] map loaded");
        };
        const handleError = (e) => {
          if (!isMounted) return;
          setFailed(true);
          console.error("[GoongMap] map error event", e);
        };

        mapInstance.on("load", handleLoad);
        mapInstance.on("error", handleError);
        mapRef.current = mapInstance;
        setReady(true);
        // safety timeout: if map not loaded in 5s, mark failed
        timeoutId = setTimeout(() => {
          if (isMounted && !didLoad) setFailed(true);
        }, 5000);

        mapInstance.__cleanupHandlers = { handleLoad, handleError };
      })
      .catch(() => {
        if (!isMounted) return;
        console.error("[GoongMap] script load error");
        setFailed(true);
      });

    return () => {
      isMounted = false;
      if (mapInstance) {
        try {
          const handlers = mapInstance.__cleanupHandlers;
          if (handlers) {
            mapInstance.off("load", handlers.handleLoad);
            mapInstance.off("error", handlers.handleError);
          }
          mapInstance.remove();
        } catch {}
      }
      mapRef.current = null;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [apiKey, zoom]);

  // Update center/markers after map ready
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const nextCenter = normalizeLngLat(center);
    if (nextCenter) {
      map.setCenter(nextCenter);
      map.resize();
    }

    // Remove old markers by keeping them on the instance
    map.__markers = map.__markers || [];
    map.__markers.forEach((m) => m.remove());
    map.__markers = [];

    markers.forEach((m) => {
      const lng = Number(m?.lng);
      const lat = Number(m?.lat);

      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        const el = document.createElement("div");
        el.className = "bg-green-600 rounded-full w-3 h-3 ring-2 ring-white";
        const marker = new window.goongjs.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map);
        map.__markers.push(marker);
      }
    });
  }, [ready, JSON.stringify(center), JSON.stringify(markers)]);

  if (fallback && (!apiKey || failed)) {
    const [lng, lat] = normalizeLngLat(center) || [106.700981, 10.776889];
    const iframeUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
    return (
      <iframe
        title="Map Fallback"
        src={iframeUrl}
        className={className}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
    );
  }

  return <div ref={containerRef} className={className} />;
};

export default GoongMap;
