export function getMatches(me, users) {
  return users
    .filter((u) => u.id !== me.id)
    .map((u) => {
      const theyTeachMe = u.offers.filter((s) => me.wants.includes(s));
      const iTeachThem = me.offers.filter((s) => u.wants.includes(s));
      const type =
        theyTeachMe.length && iTeachThem.length ? "perfect"
        : theyTeachMe.length ? "helps-you"
        : null;
      return {
        user: u, type, theyTeachMe, iTeachThem,
        score: theyTeachMe.length + iTeachThem.length,
      };
    })
    .filter((m) => m.type)
    .sort((a, b) =>
      a.type === b.type ? b.score - a.score : a.type === "perfect" ? -1 : 1
    );
}