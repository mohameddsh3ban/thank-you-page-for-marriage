// Phrase patterns for the chat miners (English). Text is passed through norm() first.
// Each table has an `any` pattern; add `him` / `her` keys when the two of you spell things
// differently (the miners use table[who] first, then table.any). Add your own pet spellings here.

const LOVE = String.raw`\bi+ ?lo+ve+ (yo+u+|u+|ya+)\b|\blo+ve+ (yo+u+|u+|ya+)\b|\blu+v+ (yo+u+|u+|ya+)\b|\bil+y+(sm)?\b`;

export const LOVE_SAID = {
  any: new RegExp(LOVE),
};

export const MISS_SAID = {
  any: /\bi? ?mi+s+e?d? (yo+u+|u+|ya+)\b|\bmissing (yo+u+|u+)\b/,
};

export const MORNING = {
  any: /\bgo+d ?mo+r?ning|\bgm\b|^mo+r?ning+\b|\brise and shine\b/,
};

export const NIGHT = {
  any: /\bgo+d ?ni+(gh)?t+\b|\bgn\b|^nighty?\b|\bnyty\b|^night\b|\bsweet dreams\b|\bsleep (well|tight)\b/,
};

export const SORRY = {
  any: /\bso+r+y+\b|\bi apologi[sz]e\b|\bmy bad\b/,
};

// "i adore you": a step past i love you
export const ADORE = {
  any: /\bi adore (yo+u+|u+)\b|\badore (yo+u+|u+)\b/,
};

const NEGATION = /(^|\s)(don'?t|dont|do not|didn'?t|didnt|never|not|can'?t|cant|won'?t|wont|stop)\s+$/;
// "you told me <words>" — one of you quoting the other
const QUOTE = /(told me|you said|you say|you always say|she said|he said|saying)\s+$/;

/** True when the match at `idx` is negated ("don't love you") or a quote of the other person. */
export function isNegatedOrQuoted(t, idx) {
  const before = t.slice(Math.max(0, idx - 28), idx);
  return NEGATION.test(before) || QUOTE.test(before);
}

/** Pick the pattern for a sender: their own spelling first, then the shared one. */
export const patternFor = (table, who) => table[who] || table.any;
