const SPOTS_KEY = "synera-study-spot-reviews";

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
  return { rating: total / count, reviews: count };
}
