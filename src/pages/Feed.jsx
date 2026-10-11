import { useEffect, useState } from "react";
import Nav from "../components/Nav";
import SkillGroup from "../components/SkillGroup";
import MatchCard from "../components/MatchCard";
import StudySpotMap from "../components/StudySpotMap";
import { SKILLS } from "../data/skills";
import { findNearbyStudySpots, getSpotRating, loadSpotReviews, saveSpotReviews, STUDY_SPOTS } from "../data/studySpots";
import { readApiJson } from "../lib/api";
import "../styles/FeedFeatures.css";

const FILTERS = [
  ["all", "All"],
  ["perfect", "Perfect swaps"],
  ["helps-you", "Can help you"],
];

const toggle = (list, item) => list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
const CAMPUS_CENTER = { lat: 42.275, lng: -83.740 };

function distanceKm(first, second) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latDelta = radians(second.lat - first.lat);
  const lngDelta = radians(second.lng - first.lng);
  const value = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function recommendSpot(partner, userLocation, reviews, spots) {
  const first = userLocation || CAMPUS_CENTER;
  const second = partner?.location || CAMPUS_CENTER;
  const midpoint = { lat: (first.lat + second.lat) / 2, lng: (first.lng + second.lng) / 2 };
  const reachable = spots.filter((spot) => distanceKm(first, spot) <= 2.5 && distanceKm(second, spot) <= 2.5);
  return [...reachable].sort((a, b) => {
    const score = (spot) => (getSpotRating(spot, reviews).rating ?? 0) - distanceKm(midpoint, spot) * 0.3;
    return score(b) - score(a);
  })[0];
}

function spotLabel(state) {
  if (state === "nearby") return "NEARBY PLACES · OPENSTREETMAP";
  if (state === "loading") return "SEARCHING NEARBY…";
  if (state === "error") return "COULD NOT LOAD NEARBY PLACES";
  if (state === "empty") return "NO NEARBY PLACES FOUND";
  return "DEMO CAMPUS · SAMPLE RATINGS";
}

export default function Feed({ profile, onHome, onLogout, onEditProfile, onEditOffers, onEditWants, onOpenChat, onShowChats, onProfileChange }) {
  const hasLocation = Boolean(profile.location);
  const [filter, setFilter] = useState("all");
  const [matches, setMatches] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [chatError, setChatError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [activePartner, setActivePartner] = useState(null);
  // Only show the sample (Michigan) spots when there is no location at all.
  const [spots, setSpots] = useState(hasLocation ? [] : STUDY_SPOTS);
  const [spotLoadState, setSpotLoadState] = useState(hasLocation ? "loading" : "demo");
  const [spotLoadError, setSpotLoadError] = useState("");
  const [selectedSpotId, setSelectedSpotId] = useState(hasLocation ? "" : "hatcher");
  const [reviews, setReviews] = useState(loadSpotReviews);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const skills = [...new Set([...SKILLS, ...(profile.customSkills || [])])];
  const selectedSpot = spots.find((spot) => spot.id === selectedSpotId) || spots[0] || null;
  const spotRating = selectedSpot ? getSpotRating(selectedSpot, reviews) : null;
  const recommendation = recommendSpot(activePartner, profile.location, reviews, spots);
  const perfect = matches.filter((m) => m.type === "perfect").length;
  const shown = filter === "all" ? matches : matches.filter((m) => m.type === filter);
  const locationLat = profile.location?.lat ?? null;
  const locationLng = profile.location?.lng ?? null;

  useEffect(() => {
    if (locationLat === null || locationLng === null) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setSpots([]);
        setSpotLoadState("loading");
        setSpotLoadError("");
        setSelectedSpotId("");
        return findNearbyStudySpots({ lat: locationLat, lng: locationLng });
      })
      .then((nearbySpots) => {
        if (cancelled || nearbySpots === null) return;
        setSpots(nearbySpots);
        setSpotLoadState(nearbySpots.length ? "nearby" : "empty");
        setSpotLoadError("");
        setSelectedSpotId(nearbySpots[0]?.id || "");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Nearby study spot search failed:", error);
        setSpots([]);
        setSpotLoadState("error");
        setSpotLoadError(error.message || "Nearby places could not be loaded. Please try again.");
        setSelectedSpotId("");
      });
    return () => { cancelled = true; };
  }, [locationLat, locationLng]);

  useEffect(() => {
    let active = true;
    fetch("/api/matches")
      .then(async (response) => {
        const result = await readApiJson(response);
        if (!response.ok) throw new Error(result.error || "Unable to load matches.");
        if (active) setMatches(result.matches);
      })
      .catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [profile]);

  const openChat = async (userId) => {
    setChatError("");
    try {
      await onOpenChat(userId);
    } catch (error) {
      setChatError(error.message || "Unable to open chat.");
    }
  };

  const saveProfile = async (nextProfile) => {
    setProfileError("");
    try {
      await onProfileChange(nextProfile);
    } catch (error) {
      setProfileError(error.message || "Unable to save your profile.");
    }
  };

  const addSkill = (skill) => {
    if (skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) return;
    saveProfile({ ...profile, customSkills: [...(profile.customSkills || []), skill] });
  };
  const planMeetup = (match) => {
    setActivePartner(match.user);
    const suggestion = recommendSpot(match.user, profile.location, reviews, spots);
    if (suggestion) setSelectedSpotId(suggestion.id);
    document.getElementById("study-spots")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const submitReview = (event) => {
    event.preventDefault();
    if (!selectedSpot) return;
    const next = {
      ...reviews,
      [selectedSpot.id]: [
        ...(reviews[selectedSpot.id] || []),
        { rating: reviewRating, text: reviewText.trim(), createdAt: new Date().toISOString() },
      ],
    };
    setReviews(next);
    saveSpotReviews(next);
    setReviewText("");
    setReviewRating(5);
    setReviewOpen(false);
  };

  return (
    <div className="container">
      <Nav inApp onHome={onHome} onLogout={onLogout} />

      <ol className="skill-progress match-progress" aria-label="Skill matching progress">
        <li className="complete"><span>01</span><b>Profile</b></li>
        <li className="complete"><span>02</span><b>Teach</b></li>
        <li className="complete"><span>03</span><b>Learn</b></li>
        <li className="current"><span>04</span><b>Matches</b></li>
      </ol>

      <div className="feed">
        <aside className="side">
          <div className="panel">
            <div className="me-head">
              <div className="me-avatar">{profile.name[0]}</div>
              <div className="me-details">
                <div className="me-name-row">
                  <div className="me-name">{profile.name}</div>
                  <button className="edit-skill" onClick={onEditProfile}>Edit</button>
                </div>
                <div className="me-sub">@{profile.username}</div>
                <div className="me-sub">{profile.major}</div>
              </div>
            </div>

            <div className="me-group">
              <div className="me-group-head">
                <span className="label">You offer</span>
                <button className="edit-skill" onClick={onEditOffers}>Edit</button>
              </div>
              <SkillGroup label="Skills you can teach" skills={skills} selected={profile.offers} tone="offer"
                onToggle={(skill) => saveProfile({ ...profile, offers: toggle(profile.offers, skill) })} onAddSkill={addSkill} />
            </div>

            <div className="me-group">
              <div className="me-group-head">
                <span className="label">You want</span>
                <button className="edit-skill" onClick={onEditWants}>Edit</button>
              </div>
              <SkillGroup label="Skills you want to learn" skills={skills} selected={profile.wants} tone="want"
                onToggle={(skill) => saveProfile({ ...profile, wants: toggle(profile.wants, skill) })} onAddSkill={addSkill} />
            </div>
            {profileError && <p className="auth-error" role="alert">{profileError}</p>}
          </div>

          <div className="stats">
            <div className="stat">
              <div className="stat-num grad-text">{perfect}</div>
              <div className="stat-label">Perfect swaps</div>
            </div>
            <div className="stat">
              <div className="stat-num grad-text">{matches.length - perfect}</div>
              <div className="stat-label">Can help you</div>
            </div>
          </div>
        </aside>

        <section>
          <div className="feed-head">
            <h1 className="display">
              Your <span className="mark">matches</span>
            </h1>
            <p>Students whose skills line up with yours. Edit either skill list to refresh your matches.</p>
          </div>

          <div className="feed-actions">
            <span className="label">{matches.length} registered matches</span>
            <button className="btn ghost" onClick={onShowChats}>Open chats</button>
          </div>
          {chatError && <div className="panel empty" role="alert">{chatError}</div>}
          {loadError && <div className="panel empty" role="alert">{loadError}</div>}

          <div className="seg">
            {FILTERS.map(([key, name]) => (
              <button key={key} className={filter === key ? "on" : ""} onClick={() => setFilter(key)}>
                {name}
              </button>
            ))}
          </div>

          {!loadError && shown.length === 0 && <div className="panel empty">No registered students match these skills yet.</div>}
          {shown.map((match, index) => (
            <MatchCard
              key={match.user.id}
              match={match}
              index={index}
              onMessage={() => openChat(match.user.id)}
              onPropose={planMeetup}
            />
          ))}

          <section className="spots-section" id="study-spots">
            <div className="spots-heading">
              <div>
                <span className="label">Study spots</span>
                <h2 className="display">Meet somewhere good</h2>
                <p>Choose a match to find a high-rated place near the midpoint between you both.</p>
              </div>
              <span className="demo-note">{spotLabel(spotLoadState)}</span>
            </div>
            {spotLoadError && <p className="map-load-note" role="status">{spotLoadError}</p>}
            {spotLoadState === "empty" && <p className="map-load-note" role="status">No named study-friendly places were found within 2.5 km. Try again later or pan the map.</p>}
            {activePartner && recommendation && (
              <div className="meetup-suggestion">
                <span className="suggestion-icon">★</span>
                <div>
                  <b>Suggested for you and {activePartner.name}: {recommendation.name}</b>
                  <span>{getSpotRating(recommendation, reviews).rating?.toFixed(1) || "No rating yet"} · {getSpotRating(recommendation, reviews).reviews} reviews · near your shared midpoint</span>
                </div>
                <button className="btn ghost" type="button" onClick={() => setSelectedSpotId(recommendation.id)}>Show on map</button>
                <button className="btn" type="button" onClick={() => openChat(activePartner.id)}>Continue in chat</button>
              </div>
            )}
            {activePartner && !recommendation && (
              <p className="no-nearby-spots">No rated campus venue is within 2.5 km of both locations. Try another match or choose a spot manually.</p>
            )}
            <div className="spots-layout">
              <StudySpotMap
                spots={spots}
                reviews={reviews}
                selectedSpotId={selectedSpotId}
                onSelectSpot={setSelectedSpotId}
                userLocation={profile.location}
                peerLocation={activePartner?.location}
                peerName={activePartner?.name}
                onUserLocation={(location) => onProfileChange({ ...profile, location })}
              />
              <div className="spot-details">
                <div className="spot-list" aria-label="Rated study spots">
                  {spots.map((spot) => {
                    const rating = getSpotRating(spot, reviews);
                    return (
                      <button key={spot.id} className={`spot-option${selectedSpot?.id === spot.id ? " selected" : ""}`} type="button" onClick={() => setSelectedSpotId(spot.id)}>
                        <span><b>{spot.name}</b><small>{spot.type}</small></span>
                        <strong className={rating.rating === null ? "unrated" : ""}>{rating.rating === null ? "New" : `★ ${rating.rating.toFixed(1)}`}</strong>
                      </button>
                    );
                  })}
                  {spots.length === 0 && (
                    <p className="spot-empty">
                      {spotLoadState === "loading" ? "Searching for places near you…" : spotLoadState === "error" ? "Nearby places are temporarily unavailable." : "No nearby places to show."}
                    </p>
                  )}
                </div>
                {selectedSpot ? <div className="spot-selected">
                  <span className="spot-type">{selectedSpot.type}</span>
                  <h3>{selectedSpot.name}</h3>
                  <div className="spot-rating"><b>{spotRating.rating === null ? "Not rated yet" : `★ ${spotRating.rating.toFixed(1)}`}</b><span>{spotRating.reviews} reviews</span></div>
                  <p>{selectedSpot.note}</p>
                  <button className="btn" type="button" onClick={() => setReviewOpen((open) => !open)}>
                    {reviewOpen ? "Close review" : "Leave a post-session rating"}
                  </button>
                  {reviewOpen && (
                    <form className="spot-review-form" onSubmit={submitReview}>
                      <span className="label">Your rating</span>
                      <div className="rating-picker" role="group" aria-label="Choose rating">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button key={rating} type="button" aria-label={`${rating} star${rating > 1 ? "s" : ""}`} aria-pressed={reviewRating === rating} className={rating <= reviewRating ? "active" : ""} onClick={() => setReviewRating(rating)}>★</button>
                        ))}
                      </div>
                      <textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="How was the study session here?" maxLength={280} rows={3} />
                      <button className="btn" type="submit">Post rating</button>
                    </form>
                  )}
                  {(reviews[selectedSpot.id] || []).length > 0 && (
                    <div className="spot-review-list">
                      <span className="label">Recent session reviews</span>
                      {[...(reviews[selectedSpot.id] || [])].reverse().slice(0, 3).map((review) => (
                        <article className="spot-review" key={review.createdAt}>
                          <b>{"★".repeat(review.rating)}<span>{"★".repeat(5 - review.rating)}</span></b>
                          {review.text && <p>{review.text}</p>}
                          <time dateTime={review.createdAt}>Your session</time>
                        </article>
                      ))}
                    </div>
                  )}
                </div> : <div className="spot-empty-state">Choose a rated place on the map or list to see details.</div>}
              </div>
            </div>
            <p className="map-disclaimer">Interactive OpenStreetMap. Venue ratings and match pins use sample campus data. Your location is shared only after you choose Locate me.</p>
          </section>
        </section>
      </div>
    </div>
  );
}