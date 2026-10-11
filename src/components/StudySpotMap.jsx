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
  const userLatitude = userLocation?.lat ?? null;
  const userLongitude = userLocation?.lng ?? null;

  useEffect(() => {
    selectRef.current = onSelectSpot;
    locationCallbackRef.current = onUserLocation;
  }, [onSelectSpot, onUserLocation]);

  useEffect(() => {
    // Determine initial center: use userLocation if available, otherwise default to a general fallback (e.g., North Carolina center)
    const initialCenter = userLatitude !== null && userLongitude !== null
      ? [userLatitude, userLongitude]
      : [35.9132, -79.0558]; // Fallback to Chapel Hill, NC coordinates

    const map = L.map(mapElement.current, { scrollWheelZoom: true }).setView(initialCenter, 15);
    
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    
    mapRef.current = map;
    
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapElement.current);
    map.whenReady(() => requestAnimationFrame(() => requestAnimationFrame(() => map.invalidateSize())));

    // Automatically try to grab user location on mount if not already provided
    if (userLatitude === null && userLongitude === null && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const location = { lat: coords.latitude, lng: coords.longitude };
          map.setView([location.lat, location.lng], 15);
          try {
            await locationCallbackRef.current?.(location);
            setLocationStatus("");
          } catch {
            setLocationStatus("Your location was found but could not be saved to your profile.");
          }
        },
        (error) => setLocationStatus(error.code === error.PERMISSION_DENIED
          ? "Location permission was denied."
          : "Could not determine your location.")
      );
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [userLatitude, userLongitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current?.remove();
    const markers = L.layerGroup().addTo(map);
    spots.forEach((spot) => {
      const { rating } = getSpotRating(spot, reviews);
      const color = rating === null ? "#607d8b" : rating >= 4.5 ? "#188653" : rating >= 4 ? "#c27b0a" : "#bd4941";
      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: selectedSpotId === spot.id ? 13 : 10,
        color: "#fff",
        weight: 3,
        fillColor: color,
        fillOpacity: 0.96,
      });
      marker.bindTooltip(`${rating === null ? "No reviews" : `${rating.toFixed(1)} ★`} · ${spot.name}`, { direction: "top", offset: [0, -8] });
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

      // Automatically center the map on your location coordinates when found
      map.setView([userLocation.lat, userLocation.lng], 15);
    }

    if (peerLocation) {
      peerLayerRef.current = L.circleMarker([peerLocation.lat, peerLocation.lng], {
        radius: 8,
        color: "#fff",
        weight: 3,
        fillColor: "#7657bd",
        fillOpacity: 1,
      }).bindTooltip(`${peerName || "Match"} · sample location`).addTo(map);
    }

    const points = spots.map((spot) => [spot.lat, spot.lng]);
    if (userLocation) points.push([userLocation.lat, userLocation.lng]);
    if (peerLocation && (!userLocation || L.latLng(userLocation).distanceTo(peerLocation) <= 15000)) {
      points.push([peerLocation.lat, peerLocation.lng]);
    }
    
    if (points.length > 1 && !userLocation) {
      map.fitBounds(points, { padding: [36, 36], maxZoom: 15 });
    }
  }, [peerLocation, peerName, spots, userLocation]);

  const showMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location is unavailable in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const location = { lat: coords.latitude, lng: coords.longitude };
        setLocationStatus("Searching for study spots nearby…");
        try {
          await locationCallbackRef.current?.(location);
          setLocationStatus("Your location and nearby study spots are shown.");
        } catch {
          setLocationStatus("Could not load nearby study spots. Check your connection and try again.");
        }
      },
      () => setLocationStatus("Location permission was unavailable."),
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