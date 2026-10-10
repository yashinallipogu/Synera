import { useMemo, useState } from "react";
import Nav from "../components/Nav";
import SkillGroup from "../components/SkillGroup";
import MatchCard from "../components/MatchCard";
import StudySpotMap from "../components/StudySpotMap";
import users from "../data/users.json";
import { SKILLS } from "../data/skills";
import { getMatches } from "../lib/match";
import { getSpotRating, loadSpotReviews, saveSpotReviews, STUDY_SPOTS } from "../data/studySpots";
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

function recommendSpot(partner, userLocation, reviews) {
  const first = userLocation || CAMPUS_CENTER;
  const second = partner?.location || CAMPUS_CENTER;
  const midpoint = { lat: (first.lat + second.lat) / 2, lng: (first.lng + second.lng) / 2 };
  const reachable = STUDY_SPOTS.filter((spot) => distanceKm(first, spot) <= 2.5 && distanceKm(second, spot) <= 2.5);
  return [...reachable].sort((a, b) => {
    const score = (spot) => getSpotRating(spot, reviews).rating - distanceKm(midpoint, spot) * 0.3;
    return score(b) - score(a);
  })[0];
}

export default function Feed({ profile, onHome, onProfileChange }) {
  const [filter, setFilter] = useState("all");
  const [activeChat, setActiveChat] = useState(null);
  const [activePartner, setActivePartner] = useState(null);
  const [selectedSpotId, setSelectedSpotId] = useState("hatcher");
  const [reviews, setReviews] = useState(loadSpotReviews);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);

  const matches = useMemo(() => getMatches(profile, users), [profile]);
  const perfect = matches.filter((m) => m.type === "perfect").length;
  const shown = filter === "all" ? matches : matches.filter((m) => m.type === filter);
  const skills = [...new Set([...SKILLS, ...(profile.customSkills || [])])];
  const selectedSpot = STUDY_SPOTS.find((spot) => spot.id === selectedSpotId) || STUDY_SPOTS[0];
  const spotRating = getSpotRating(selectedSpot, reviews);
  const recommendation = recommendSpot(activePartner, profile.location, reviews);

  const updateSkills = (field, skill) => onProfileChange({ ...profile, [field]: toggle(profile[field], skill) });
  const addSkill = (skill) => {
    if (skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) return;
    onProfileChange({ ...profile, customSkills: [...(profile.customSkills || []), skill] });
  };
  const planMeetup = (match) => {
    setActivePartner(match.user);
    const suggestion = recommendSpot(match.user, profile.location, reviews);
    if (suggestion) setSelectedSpotId(suggestion.id);
    document.getElementById("study-spots")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const submitReview = (event) => {
    event.preventDefault();
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
      <Nav inApp onHome={onHome} />

      <div className="feed">
        <aside className="side">
          <div className="panel">
            <div className="me-head">
              <div className="me-avatar">{profile.name[0]}</div>
              <div>
                <div className="me-name">{profile.name}</div>
                <div className="me-sub">{profile.major}</div>
              </div>
            </div>

            <div className="me-group">
              <span className="label">You offer</span>
              <SkillGroup label="Skills you can teach" skills={skills} selected={profile.offers} tone="offer"
                onToggle={(skill) => updateSkills("offers", skill)} onAddSkill={addSkill} />
            </div>

            <div className="me-group">
              <span className="label">You want</span>
              <SkillGroup label="Skills you want to learn" skills={skills} selected={profile.wants} tone="want"
                onToggle={(skill) => updateSkills("wants", skill)} onAddSkill={addSkill} />
            </div>

            <div className="me-group">
              <span className="label">Availability</span>
              <div className="chips">
                {profile.availability.map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
            </div>
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
            <p>Students whose skills line up with yours. Swap what you know for what you want to learn.</p>
          </div>

          <div className="seg">
            {FILTERS.map(([key, name]) => (
              <button key={key} className={filter === key ? "on" : ""} onClick={() => setFilter(key)}>
                {name}
              </button>
            ))}
          </div>

          {shown.length === 0 && <div className="panel empty">No matches here yet. Try different skills.</div>}
          {shown.map((m, i) => (
            <MatchCard
              key={m.user.id}
              match={m}
              index={i}
              onPropose={planMeetup}
              chatOpen={activeChat === m.user.id}
              onToggleChat={(id) => setActiveChat((current) => current === id ? null : id)}
            />
          ))}

          <section className="spots-section" id="study-spots">
            <div className="spots-heading">
              <div>
                <span className="label">Study spots</span>
                <h2 className="display">Meet somewhere good</h2>
                <p>Choose a match to find a high-rated place near the midpoint between you both.</p>
              </div>
              <span className="demo-note">DEMO CAMPUS · SAMPLE RATINGS</span>
            </div>
            {activePartner && recommendation && (
              <div className="meetup-suggestion">
                <span className="suggestion-icon">★</span>
                <div>
                  <b>Suggested for you and {activePartner.name}: {recommendation.name}</b>
                  <span>{getSpotRating(recommendation, reviews).rating.toFixed(1)} rating · {getSpotRating(recommendation, reviews).reviews} reviews · near your shared midpoint</span>
                </div>
                <button className="btn ghost" type="button" onClick={() => setSelectedSpotId(recommendation.id)}>Show on map</button>
              </div>
            )}
            {activePartner && !recommendation && (
              <p className="no-nearby-spots">No rated campus venue is within 2.5 km of both locations. Try another match or choose a spot manually.</p>
            )}
            <div className="spots-layout">
              <StudySpotMap
                spots={STUDY_SPOTS}
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
                  {STUDY_SPOTS.map((spot) => {
                    const rating = getSpotRating(spot, reviews);
                    return (
                      <button key={spot.id} className={`spot-option${selectedSpot.id === spot.id ? " selected" : ""}`} type="button" onClick={() => setSelectedSpotId(spot.id)}>
                        <span><b>{spot.name}</b><small>{spot.type}</small></span>
                        <strong>★ {rating.rating.toFixed(1)}</strong>
                      </button>
                    );
                  })}
                </div>
                <div className="spot-selected">
                  <span className="spot-type">{selectedSpot.type}</span>
                  <h3>{selectedSpot.name}</h3>
                  <div className="spot-rating"><b>★ {spotRating.rating.toFixed(1)}</b><span>{spotRating.reviews} reviews</span></div>
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
                </div>
              </div>
            </div>
            <p className="map-disclaimer">Interactive OpenStreetMap. Venue ratings and match pins use sample campus data. Your location is shared only after you choose Locate me.</p>
          </section>
        </section>
      </div>
    </div>
  );
}