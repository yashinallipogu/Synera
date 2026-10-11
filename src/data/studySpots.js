const SPOTS_KEY = "synera-study-spot-reviews";
const SEARCH_RADIUS_METERS = 2500;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export const STUDY_SPOTS = [
  { id: "hatcher", name: "Hatcher Graduate Library", type: "Library", lat: 42.2757, lng: -83.7409, rating: 4.8, reviews: 5, note: "Quiet floors, reliable study tables" },
  { id: "union", name: "Michigan Union", type: "Student center", lat: 42.2741, lng: -83.7408, rating: 4.3, reviews: 5, note: "Central, social, and easy to find" },
  { id: "shapiro", name: "Shapiro Library", type: "Library", lat: 42.2751, lng: -83.7377, rating: 4.6, reviews: 5, note: "Lots of seating and group rooms" },
  { id: "law-quad", name: "Law Quad Reading Room", type: "Quiet study", lat: 42.2731, lng: -83.7395, rating: 4.7, reviews: 5, note: "Calm indoor tables near central campus" },
  { id: "ross", name: "Ross School Cafe", type: "Cafe", lat: 42.2728, lng: -83.7388, rating: 3.9, reviews: 5, note: "Coffee nearby, busier around lunch" },
  { id: "diag", name: "The Diag", type: "Outdoor", lat: 42.2754, lng: -83.7385, rating: 4.1, reviews: 5, note: "Outdoor tables when the weather is good" },
];

export function loadSpotReviews() {
  try {
    const value = JSON.parse(localStorage.getItem(SPOTS_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export function saveSpotReviews(reviews) {
  localStorage.setItem(SPOTS_KEY, JSON.stringify(reviews));
}

export function getSpotRating(spot, reviewsBySpot) {
  const reviews = reviewsBySpot[spot.id] || [];
  const total = spot.rating * spot.reviews + reviews.reduce((sum, review) => sum + review.rating, 0);
  const count = spot.reviews + reviews.length;
  return { rating: count ? total / count : null, reviews: count };
}

function distanceMeters(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latDelta = radians(second.lat - first.lat);
  const lngDelta = radians(second.lng - first.lng);
  const value = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function studySpotType(amenity) {
  if (amenity === "library") return "Library";
  if (amenity === "cafe") return "Cafe";
  if (amenity === "coworking_space") return "Coworking space";
  if (amenity === "community_centre") return "Community center";
  return "Campus";
}

export async function findNearbyStudySpots(location) {
  const { lat, lng } = location;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90
    || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new TypeError("A valid latitude and longitude are required to find nearby study spots.");
  }

  const query = `[out:json][timeout:20];(nwr(around:${SEARCH_RADIUS_METERS},${lat},${lng})["amenity"~"^(library|cafe|coworking_space|community_centre|university)$"]["name"];);out center tags;`;
  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
  });
  if (!response.ok) {
    throw new Error(`Nearby study spot search failed with HTTP ${response.status}.`);
  }

  const result = await response.json();
  if (!Array.isArray(result.elements)) {
    throw new Error("Nearby study spot search returned an invalid response.");
  }

  return result.elements
    .filter((element) => element.tags?.name)
    .map((element) => {
      const coordinates = element.center || element;
      return {
        id: `osm-${element.type}-${element.id}`,
        name: element.tags.name,
        type: studySpotType(element.tags.amenity),
        lat: coordinates.lat,
        lng: coordinates.lon,
        rating: 0,
        reviews: 0,
        note: "OpenStreetMap place. Confirm hours and access before meeting.",
      };
    })
    .filter((spot) => Number.isFinite(spot.lat) && Number.isFinite(spot.lng)
      && distanceMeters(location, spot) <= SEARCH_RADIUS_METERS)
    .sort((first, second) => distanceMeters(location, first) - distanceMeters(location, second));
}
