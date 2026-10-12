// One song for the whole page. Prefers a local mp3 (enables Web Audio effects);
// falls back to a hidden YouTube player when the file is missing.

/** @param {string} url */
async function fileExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok && (res.headers.get('content-type') || '').startsWith('audio');
  } catch {
    return false;
  }
}

function mp3Source(url) {
  const el = new Audio(url);
  el.loop = true;
  el.preload = 'auto';
  let graph = null;

  function ensureGraph() {
    if (graph) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 22000;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(filter).connect(gain).connect(analyser).connect(ctx.destination);
    graph = { ctx, gain, filter, analyser, bins: new Uint8Array(analyser.frequencyBinCount) };
  }

  return {
    kind: 'mp3',
    get element() { return el; },
    play() {
      ensureGraph();
      graph?.ctx.resume();
      return el.play();
    },
    /** Starts playing at zero volume (inside a tap, for Safari); setVolume brings it in. */
    prime() {
      ensureGraph();
      if (graph) {
        graph.gain.gain.cancelScheduledValues(graph.ctx.currentTime);
        graph.gain.gain.setValueAtTime(0, graph.ctx.currentTime);
        graph.ctx.resume();
      } else {
        el.volume = 0;
      }
      return el.play();
    },
    pause() { el.pause(); },
    seek(t) { el.currentTime = Math.max(0, t); },
    get duration() { return el.duration || 0; },
    get time() { return el.currentTime; },
    get playing() { return !el.paused; },
    /** Bass energy 0..1 for beat-reactive visuals. */
    energy() {
      if (!graph) return 0;
      graph.analyser.getByteFrequencyData(graph.bins);
      let sum = 0;
      for (let i = 1; i < 8; i++) sum += graph.bins[i];
      return Math.min(1, Math.max(0, (sum / 7 - 120) / 120));
    },
    /** Later chapters: duck under voice notes, muffle during "seasons apart". */
    setVolume(v, seconds = 0.6) {
      if (graph) graph.gain.gain.setTargetAtTime(v, graph.ctx.currentTime, seconds / 3);
      else el.volume = v;
    },
    setMuffle(on, seconds = 1.5) { graph?.filter.frequency.setTargetAtTime(on ? 650 : 22000, graph.ctx.currentTime, seconds / 3); },
  };
}

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => reject(new Error('YouTube API failed to load'));
    document.head.append(s);
  });
}

async function youtubeSource(videoId, hostId) {
  const YT = await loadYouTubeApi();
  let failed = null;
  const player = await new Promise(resolve => {
    const p = new YT.Player(hostId, {
      videoId,
      width: 1, height: 1,
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, playsinline: 1, loop: 1, playlist: videoId, rel: 0 },
      events: {
        onReady: () => resolve(p),
        onError: e => { failed = new Error(`YouTube error ${e.data}`); },
      },
    });
  });
  return {
    kind: 'youtube',
    play() {
      if (failed) return Promise.reject(failed);
      player.unMute();
      player.setVolume(100);
      player.playVideo();
      return Promise.resolve();
    },
    prime() {
      if (failed) return Promise.reject(failed);
      player.unMute();
      player.setVolume(0);
      player.playVideo();
      return Promise.resolve();
    },
    pause() { player.pauseVideo(); },
    seek(t) { player.seekTo(Math.max(0, t), true); },
    get duration() { return player.getDuration?.() || 0; },
    get time() { return player.getCurrentTime?.() || 0; },
    get playing() { return player.getPlayerState?.() === YT.PlayerState.PLAYING; },
    energy() { return 0; },
    setVolume(v) { player.setVolume(Math.round(v * 100)); },
    setMuffle() {},
  };
}

/**
 * Resolve the best available source: the local mp3 when the file is really there (a missing file,
 * or a dev server / host answering with its HTML fallback, fails the audio content-type check),
 * otherwise the YouTube video; null when neither is configured. Call early (before the user's tap) so play()
 * can run synchronously inside the tap handler, which browsers require for sound.
 * @param {string} [preloaded] blob: URL of the mp3 already fetched by the loading screen
 */
export async function createSong({ mp3, youtubeId }, ytHostId, preloaded) {
  if (preloaded?.startsWith('blob:')) return mp3Source(preloaded);
  if (mp3 && await fileExists(mp3)) return mp3Source(mp3);
  if (!youtubeId) return null; // no song configured: the page runs silent
  return youtubeSource(youtubeId, ytHostId);
}
