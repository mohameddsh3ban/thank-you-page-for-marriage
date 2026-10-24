// The one place to make this site yours: names, dates and the song.
export const CONFIG = {
  herName: 'Mia',   // who the letter is for (the big script title, the phone, the chapters)
  fromName: 'Mark', // who wrote it (the lock-screen notification, the notes, the signatures)

  // dates are ISO strings with your own time-zone offset
  metOn: '2019-09-14T23:30:00-04:00',       // the first message: the hero counts up from here
  officialDay: '2019-10-05T00:00:00-04:00', // the first date / the day it became official
  weddingDay: '2025-06-07T16:00:00-04:00',  // the day she said "i do"

  song: {
    title: 'Thank You',
    artist: 'Max + Johann',
    // Optional: drop your own file at public/audio/thank-you.mp3 (git-ignored). When it's there it's
    // preloaded and enables the beat-reactive effects; when it isn't, the YouTube video below plays.
    mp3: '/audio/thank-you.mp3',
    youtubeId: 'z1I3KSASBfE',
    // Optional time-synced lyrics (.lrc). No file → the lyric lines simply stay empty.
    // Put one at public/lyrics.lrc (git-ignored) and fine-tune it with /sync.html in dev.
    lyricsUrl: '/lyrics.lrc',
    lyricOffsetSec: 0, // positive = lyrics appear later
  },
};

/**
 * Writes the names from CONFIG into the page: [data-her-name], [data-from-name] (add ="lower" for
 * the lower-case voice) and [data-script-name] (the first letter in the script face, like the gate).
 * @param {ParentNode} [root]
 */
export function paintNames(root = document) {
  const fill = (attr, name) => root.querySelectorAll(`[${attr}]`).forEach(el => {
    el.textContent = el.getAttribute(attr) === 'lower' ? name.toLowerCase() : name;
  });
  fill('data-her-name', CONFIG.herName);
  fill('data-from-name', CONFIG.fromName);
  root.querySelectorAll('[data-script-name]').forEach(el => {
    const name = CONFIG.herName;
    const script = document.createElement('span');
    script.className = 'script';
    script.textContent = name.slice(0, 1);
    el.replaceChildren(script, name.slice(1));
  });
}
