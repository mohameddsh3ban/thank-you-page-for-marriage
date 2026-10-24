# Thank You Page for Marriage

**Live demo:** https://letter.devstudiocraft.com (open it on a laptop with sound on)

A scroll-driven "thank you for marrying me" letter, built as a website. She opens a sealed letter,
finds a note on "her phone", opens it and dives into a long page of chapters: how you met,
your chat in numbers, every day you talked, the years, the places, her, a gallery, love notes, a letter,
and a final thank you timed to your song.

The sample is a fictional couple, **Mark** and **Mia** (met in Brooklyn in 2019, married 7 June 2025).
Everything in it is invented, and the sample photos are AI-generated: no real people.
Swap in your own names, dates, words and photos to make it yours.

Built with Vite, vanilla JS, GSAP, Lenis and Leaflet. It's made for laptops: phones get a short note
asking her to open it on a bigger screen.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Dev-only URL flags (ignored in production builds):

| URL | What it does |
| --- | --- |
| `/?open` | skips the gate and every loader, so you can work on the chapters quickly (no music) |
| `/?preload` | skips the gate but runs the second loading screen |
| `/?phone` | goes straight to the phone's lock screen (no letter, no music) |

## Make it yours

| What | Where |
| --- | --- |
| Names, dates, the song | `src/config.js` (`herName`, `fromName`, `metOn`, `officialDay`, `weddingDay`, `song`) |
| Chapter markup and copy | `site-src/NN-<chapter>.html`, then `node scripts/assemble-site.mjs` (or `npm run site`) to rebuild `public/private/site.html` |
| Chapter data (photos, letter, places, stats, timeline…) | `src/content/*` |
| Day cards and love notes | `public/private/day-cards.json`, `public/private/love.json` |
| Photos | `public/photos/` (see below) |

**Photos.** `npm run photos -- path/to/folder --prefix us` resizes your photos to WebP
(1400px max, plus a 480px `.t.webp` thumbnail), removes their metadata (including GPS) and prints the
`{ src, thumb, caption }` items to paste into `src/content/chapter-photos.js`.

**Building the data from your own WhatsApp chat (optional).** Export the chat from WhatsApp (with
media if you want voice-note minutes) and unzip it into `chat-export/`, which is git-ignored. Then:

```bash
CHAT_ME="Your name" CHAT_HER="Her name" npm run chat:days    # src/content/days.json (the ledger of days)
CHAT_ME="Your name" CHAT_HER="Her name" npm run chat:stats   # src/content/chat-numbers.json
CHAT_ME="Your name" CHAT_HER="Her name" npm run chat:love    # public/private/love.json
```

Use the names exactly as they appear in the export. Set `CHAT_DATES=mdy` if your phone writes
month/day dates. The phrase lists ("i love you", "good morning"…) are in `scripts/lib/phrases.mjs`:
add your own spellings there. `chat:love` also writes `chat-export/love-candidates.json` for review.
Put the ids of lines you'd rather leave out into `chat-export/love-skip.json` and run it again.
Be careful what you publish: these files hold real messages.

## Your song

The default is "Thank You" by Max + Johann, played from YouTube (`CONFIG.song.youtubeId`). For better
sound and the beat-reactive effects:

1. Put your own mp3 at `public/audio/thank-you.mp3` (or change `CONFIG.song.mp3`). It's git-ignored.
   If the file isn't there, the site uses the YouTube embed.
2. Optional synced lyrics: run `npm run lyrics` (fetches from LRCLIB) or write your own
   `public/lyrics.lrc`, then fine-tune the timing at `http://localhost:5173/sync.html` (dev only).
   Lyrics are copyrighted, so `public/lyrics.lrc` is git-ignored. Without the file, the lyric lines stay empty.

## Deploy (Cloudflare Pages)

It's a static site: `dist/` after `npm run build`. `public/_headers` sets the cache rules the loading
screens rely on (hashed bundles forever, media for a day) and keeps it out of search engines.

```bash
npx wrangler login
npx wrangler pages project create thank-you-page-for-marriage
npm run deploy
```

Change `thank-you-page-for-marriage` in the `deploy` script in `package.json` to your own project name.
Anything you put on it is public to whoever has the link, so mind what you publish from your own chat.

## Credits

- Decorative art (roses, cupids, clouds, frames, paper) in `public/art/`: AI-generated for this project.
- Photo credits and notes: [`public/photos/CREDITS.md`](public/photos/CREDITS.md)
- Song: "Thank You" by Max + Johann, embedded from YouTube. It isn't included in this repo.
- Fonts: Noto Serif Display (condensed), Bodoni Moda, Instrument Sans and Pinyon Script from Google Fonts.

## License

[MIT](LICENSE)
