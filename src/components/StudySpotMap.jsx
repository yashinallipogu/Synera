import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getSpotRating } from "../data/studySpots";

export default function StudySpotMap({ spots, reviews, selectedSpotId, onSelectSpot, userLocation, peerLocation, peerName, onUserLocation }) {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(null);
  const locationLayerRef = useRef(null);
  const peerLayerRef = useRef(null);
  const selectRef = useRef(onSelectSpot);
  const locationCallbackRef = useRef(onUserLocation);
  const [locationStatus, setLocationStatus] = useState("");

  useEffect(() => {
    selectRef.current = onSelectSpot;
    locationCallbackRef.current = onUserLocation;
  }, [onSelectSpot, onUserLocation]);

  useEffect(() => {
    const map = L.map(mapElement.current, { scrollWheelZoom: true }).setView([42.275, -83.740], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapElement.current);
    map.whenReady(() => requestAnimationFrame(() => requestAnimationFrame(() => map.invalidateSize())));

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current?.remove();
    const markers = L.layerGroup().addTo(map);
    spots.forEach((spot) => {
      const { rating } = getSpotRating(spot, reviews);
      const color = rating >= 4.5 ? "#188653" : rating >= 4 ? "#c27b0a" : "#bd4941";
      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: selectedSpotId === spot.id ? 13 : 10,
        color: "#fff",
        weight: 3,
        fillColor: color,
        fillOpacity: 0.96,
      });
      marker.bindTooltip(`${rating.toFixed(1)} ★ · ${spot.name}`, { direction: "top", offset: [0, -8] });
      marker.on("click", () => selectRef.current(spot.id));
      markers.addLayer(marker);
    });
    markersRef.current = markers;
    return () => markers.remove();
  }, [reviews, selectedSpotId, spots]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    locationLayerRef.current?.remove();
    peerLayerRef.current?.remove();
    if (userLocation) {
      locationLayerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#177dcc",
        fillOpacity: 1,
      }).bindTooltip("Your location").addTo(map);
    }
    if (peerLocation) {
      peerLayerRef.current = L.circleMarker([peerLocation.lat, peerLocation.lng], {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#7657bd",
        fillOpacity: 1,
      }).bindTooltip(`${peerName || "Match"} · sample location`).addTo(map);
      const points = [[peerLocation.lat, peerLocation.lng]];
      if (userLocation) points.push([userLocation.lat, userLocation.lng]);
      map.fitBounds(points, { padding: [45, 45], maxZoom: 16 });
    } else if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 16);
    }
  }, [peerLocation, peerName, userLocation]);

  const showMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location is unavailable in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        locationCallbackRef.current?.({ lat: coords.latitude, lng: coords.longitude });
        setLocationStatus("Showing your location on this device.");
      },
      () => setLocationStatus("Location permission was unavailable. The demo campus remains centered."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="study-map-frame">
      <div className="study-map" ref={mapElement} aria-label="Interactive map of rated study spots" />
      <button className="map-locate btn" type="button" onClick={showMyLocation}>◎ Locate me</button>
      {locationStatus && <span className="map-status" role="status">{locationStatus}</span>}
    </div>
  );
}
