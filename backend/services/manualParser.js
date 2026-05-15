/**
 * Manual Parser Service
 *
 * Only extracts the 3 things you provide:
 *   1. Title + Year  (line 1)
 *   2. Language      (line 2)
 *   3. Filename + Links (remaining lines — filename before each URL block)
 *
 * Everything else (genre, director, cast, poster, backdrop, rating, runtime,
 * country, description, originalTitle) comes from TMDB — not guessed here.
 */

const QUALITY_RE = /\b(4K|2160p|1080p|720p|480p|360p|BluRay|BDRip|WEB-DL|WEBRip|HDCAM|HDTS|CAM|DVDRip|HDTV)\b/i;
const SIZE_RE    = /\b(\d+(?:\.\d+)?)\s*(GB|MB|TB)\b/i;
const YEAR_RE    = /\b(19|20)\d{2}\b/;
const SE_RE      = /[Ss](\d{1,2})[Ee](\d{1,3})/;
const S_ONLY_RE  = /(?:Season|S)[\s._-]*(\d{1,2})\b/i;
const E_ONLY_RE  = /(?:Episode|Ep?|E)[\s._-]*(\d{1,3})\b/i;
const URL_RE     = /https?:\/\/[^\s<>"']+/gi;

const isUrlLine = (l) => /https?:\/\//i.test(l);

const isFilenameLine = (l) => {
  if (isUrlLine(l)) return false;
  return /\.(mkv|mp4|avi|mov|ts|zip|rar|7z)\b/i.test(l)
      || QUALITY_RE.test(l)
      || SE_RE.test(l);
};

const ensureAbsoluteUrl = (url) => {
  url = url.trim().replace(/[.,;:)>»]+$/, '');
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//'))      return 'https:' + url;
  return 'https://' + url;
};

const extractQuality = (text) => { const m = text.match(QUALITY_RE); return m ? m[0] : ''; };
const extractSize    = (text) => { const m = text.match(SIZE_RE);    return m ? m[0] : ''; };

const extractSeasonEpisode = (text) => {
  const combo = text.match(SE_RE);
  if (combo) return { season: parseInt(combo[1], 10), episode: parseInt(combo[2], 10) };
  const s = text.match(S_ONLY_RE);
  const e = text.match(E_ONLY_RE);
  return { season: s ? parseInt(s[1], 10) : null, episode: e ? parseInt(e[1], 10) : null };
};

const buildLabel = (season, episode) => {
  if (season && episode) return `S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`;
  if (season)            return `Season ${season}`;
  return 'Movie';
};

// Language detection — checked in priority order
const LANG_MAP = [
  ['dual audio',    'Hindi & English'],
  ['multi audio',   'Hindi & English'],
  ['hindi english', 'Hindi & English'],
  ['hindi',         'Hindi'],
  ['tamil',         'Tamil'],
  ['telugu',        'Telugu'],
  ['malayalam',     'Malayalam'],
  ['kannada',       'Kannada'],
  ['punjabi',       'Punjabi'],
  ['bengali',       'Bengali'],
  ['korean',        'Korean'],
  ['japanese',      'Japanese'],
  ['chinese',       'Chinese'],
  ['spanish',       'Spanish'],
  ['french',        'French'],
  ['german',        'German'],
  ['arabic',        'Arabic'],
  ['russian',       'Russian'],
  ['portuguese',    'Portuguese'],
  ['italian',       'Italian'],
  ['turkish',       'Turkish'],
  ['english',       'English'],
];

const detectPrimaryLanguage = (text) => {
  if (!text) return '';
  const t = text.toLowerCase().replace(/[^a-z ]/g, ' ');
  for (const [key, val] of LANG_MAP) {
    if (t.includes(key)) return val;
  }
  return text.trim(); // preserve as-is if not matched (e.g. "Tamil & Telugu")
};

const splitLanguageLine = (line) =>
  line.split(/[,&+\/]|\band\b/i).map(s => s.trim()).filter(Boolean);

const inferType = (text) => {
  const t = text.toLowerCase();
  if (/\banime\b/.test(t)) return 'anime';
  if (/\b(series|season|episode|web.?series|ongoing|completed|mini.?series)\b/.test(t)) return 'series';
  if (SE_RE.test(t) || S_ONLY_RE.test(t)) return 'series';
  return 'movie';
};

const cleanTitle = (raw) => {
  if (!raw) return 'Unknown Title';
  return raw
    .replace(/\s*[–|]\s*.+$/, '')
    .replace(/\(\d{4}\)/g, '')
    .replace(/\b(19|20)\d{2}\b/, '')
    .replace(/\b(4K|2160p|1080p|720p|BluRay|BDRip|WEB-DL|WEBRip|HDCAM|CAM|DVDRip|HDTV|H\.?264|H\.?265|HEVC|x264|x265|AAC|DDP?5?\.?1?|Atmos|HDR10?|DV|DoVi|SDR)\b/gi, '')
    .replace(/\b(S\d{1,2}E?\d{0,2}|Season\s+\d+|Episode\s+\d+|Ep\.?\s*\d+)\b/gi, '')
    .replace(/[\[\{][^\]\}]*[\]\}]/g, '')
    .replace(/(?<=\w)\.(?=\w)/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-_]+|[\s\-_]+$/g, '')
    .trim() || 'Unknown Title';
};

export const parseManualMessage = (text) => {
  if (!text || typeof text !== 'string') throw new Error('No text provided to manual parser');

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) throw new Error('Empty input');

  // ── 1. Title + Year ────────────────────────────────────────────────────────
  const titleLine = lines[0];
  const yearMatch = titleLine.match(YEAR_RE);
  const year      = yearMatch ? parseInt(yearMatch[0], 10) : null;
  const title     = cleanTitle(titleLine);

  // ── 2. Language ───────────────────────────────────────────────────────────
  let langLine     = '';
  let bodyStartIdx = 1;

  if (lines.length > 1) {
    const candidate = lines[1];
    if (!isUrlLine(candidate) && !isFilenameLine(candidate) && candidate.length < 100) {
      langLine     = candidate;
      bodyStartIdx = 2;
    }
  }

  // Strip "Language:" prefix if present (e.g. "Language: Hindi, Tamil & English")
  const langValueRaw = /^language\s*:\s*/i.test(langLine)
    ? langLine.replace(/^language\s*:\s*/i, '').trim()
    : langLine;

  // Split into individual language tokens on , & + / and
  const audioLanguages = langValueRaw
    ? splitLanguageLine(langValueRaw)
        .map(s => {
          const matched = detectPrimaryLanguage(s);
          return matched || s.trim();
        })
        .filter(Boolean)
    : [];

  // Build display language string: "Hindi, Tamil & English"
  const language = audioLanguages.length > 1
    ? audioLanguages.slice(0, -1).join(', ') + ' & ' + audioLanguages[audioLanguages.length - 1]
    : audioLanguages[0] || detectPrimaryLanguage(langLine);

  // ── 3. Filenames + Links ───────────────────────────────────────────────────
  const bodyLines = lines.slice(bodyStartIdx);
  const links     = [];
  let currentFilename = '';
  let currentContext  = '';

  for (const line of bodyLines) {
    if (isUrlLine(line)) {
      const urls = [...line.matchAll(URL_RE)].map(m => ensureAbsoluteUrl(m[0]));

      for (const url of urls) {
        const seSource          = currentContext || url;
        const { season, episode } = extractSeasonEpisode(seSource);
        const quality           = extractQuality(currentContext) || extractQuality(url);
        const size              = extractSize(currentContext);

        links.push({
          label:    buildLabel(season, episode),
          url,
          quality,
          size,
          season,
          episode,
          filename: currentFilename,
        });
      }
    } else if (isFilenameLine(line)) {
      currentFilename = line;
      currentContext  = line;
    } else if (QUALITY_RE.test(line) || SE_RE.test(line) || S_ONLY_RE.test(line)) {
      // Annotation line with useful signals (e.g. "Season 1 Complete")
      currentFilename = line;
      currentContext  = line;
    }
    // All other lines ignored — TMDB handles description/genre/etc.
  }

  // Infer type from title + filenames (series signals like S01E01)
  const typeContext = [titleLine, ...bodyLines].join(' ');
  const type = inferType(typeContext);

  return {
    title,
    type,
    year,
    audio: audioLanguages,
    links,
    link: links[0]?.url || '',
    // Everything below is intentionally null — TMDB fills these via enrichment
    tmdbId:        null,
    originalTitle: null,
    poster:        null,
    backdrop:      null,
    genre:         [],
    director:      null,
    cast:          [],
    rating:        null,
    runtime:       null,
    status:        null,
    country:       null,
    description:   null,
  };
};
