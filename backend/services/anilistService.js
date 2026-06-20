import axios from 'axios';

/**
 * AniList Service
 *
 * AniList has a real, officially sanctioned public GraphQL API (unlike
 * MyDramaList, which has none) — see https://docs.anilist.co. No API key
 * is required for public media queries. This is used as a manual-parser
 * override for anime, since TMDB's `/tv` endpoint is a poor fit for anime
 * (often wrong episode counts/art, missing native titles, weird season
 * splitting for things that AniList tracks correctly as one continuous
 * series or correctly split cours).
 *
 * Unlike the MDL override (which selectively patches a few fields on top
 * of an existing TMDB match), this is a FULL REPLACE — same behavior as
 * the TMDB/IMDb override boxes — since AniList is treated as the better
 * primary source for anime specifically.
 */

const ANILIST_API_URL = 'https://graphql.anilist.co';

const cleanField = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s;
};

/**
 * AniList slugs/URLs look like:
 *   https://anilist.co/anime/16498/Shingeki-no-Kyojin/
 *   https://anilist.co/anime/16498
 * Extract the numeric ID. Also accepts a bare numeric ID typed directly.
 */
export const extractAnilistId = (input) => {
  if (!input) return null;
  const trimmed = String(input).trim();

  if (/^\d+$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/anilist\.co\/anime\/(\d+)/i);
  return match ? match[1] : null;
};

/**
 * AniList's `description` field is HTML (e.g. "<i>Note:</i> some text<br><br>more").
 * Strip tags and decode the handful of entities AniList commonly uses.
 */
const stripDescriptionHtml = (html) => {
  const clean = cleanField(html);
  if (!clean) return null;
  return clean
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
};

/**
 * AniList's status enum doesn't match TMDB's free-text status strings, so
 * map it to the same kind of human-readable label TMDB/OMDb results use.
 */
const mapAnilistStatus = (status) => {
  const map = {
    FINISHED: 'Completed',
    RELEASING: 'Ongoing',
    NOT_YET_RELEASED: 'Upcoming',
    CANCELLED: 'Cancelled',
    HIATUS: 'On Hiatus',
  };
  return map[status] || null;
};

/**
 * AniList's averageScore is 0-100; TMDB/OMDb/IMDb are all on a 0-10 scale.
 * Convert and keep one decimal place, e.g. 84 -> "8.4".
 */
const convertAnilistScore = (averageScore) => {
  if (averageScore === null || averageScore === undefined) return null;
  return (averageScore / 10).toFixed(1);
};

/**
 * AniList's duration is minutes-per-episode (an int). For a movie this is
 * the runtime; for a series this is per-episode length — same convention
 * TMDB uses for `episode_run_time`.
 */
const formatAnilistRuntime = (duration) => {
  if (!duration) return null;
  return `${duration} min`;
};

/**
 * AniList doesn't tag a clean "Director" role the way TMDB credits do —
 * staff roles are free text like "Director", "Series Director", "Chief Director",
 * "Episode Director", etc. Take the first staff member whose role contains
 * "director" (case-insensitive), preferring an exact "Director" match.
 */
const extractDirector = (staffEdges) => {
  if (!Array.isArray(staffEdges) || staffEdges.length === 0) return null;

  const exact = staffEdges.find((e) => e.role?.toLowerCase() === 'director');
  if (exact?.node?.name?.full) return exact.node.name.full;

  const fuzzy = staffEdges.find((e) => e.role?.toLowerCase().includes('director'));
  return fuzzy?.node?.name?.full || null;
};

const normalizeAnilistMedia = (media) => {
  if (!media) return null;

  const studios = media.studios?.nodes?.map((s) => s.name).filter(Boolean) || [];

  return {
    tmdbId: null,
    imdbId: null,
    anilistId: media.id ? String(media.id) : null,
    title: cleanField(media.title?.english) || cleanField(media.title?.romaji),
    originalTitle: cleanField(media.title?.native) || cleanField(media.title?.romaji),
    poster: cleanField(media.coverImage?.extraLarge) || cleanField(media.coverImage?.large) || null,
    backdrop: cleanField(media.bannerImage),
    rating: convertAnilistScore(media.averageScore),
    runtime: formatAnilistRuntime(media.duration),
    status: mapAnilistStatus(media.status),
    year: media.startDate?.year || media.seasonYear || null,
    type: 'anime',
    genre: Array.isArray(media.genres) ? media.genres.filter(Boolean) : [],
    country: media.countryOfOrigin || 'Japan',
    director: extractDirector(media.staff?.edges),
    cast: Array.isArray(media.characters?.edges)
      ? media.characters.edges.slice(0, 10).map((e) => ({
          name: e.node?.name?.full || null,
          character: null,
          profile_path: e.node?.image?.large || null,
        })).filter((c) => c.name)
      : [],
    studios,
    description: stripDescriptionHtml(media.description),
    source: 'anilist',
  };
};

const MEDIA_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      coverImage { extraLarge large }
      bannerImage
      description
      averageScore
      duration
      status
      startDate { year }
      seasonYear
      genres
      countryOfOrigin
      studios(isMain: true) { nodes { name } }
      staff(perPage: 10, sort: RELEVANCE) {
        edges { role node { name { full } } }
      }
      characters(perPage: 10, sort: ROLE) {
        edges { node { name { full } image { large } } }
      }
    }
  }
`;

/**
 * Fetch full anime details from AniList by numeric media ID.
 * Used for the manual-parser "paste AniList URL" override — a FULL
 * REPLACE of the existing TMDB/OMDb match, since AniList is the better
 * primary source for anime specifically.
 */
export const fetchFullDetailsByAnilistId = async (anilistId) => {
  if (!anilistId) return null;

  try {
    const response = await axios.post(
      ANILIST_API_URL,
      { query: MEDIA_QUERY, variables: { id: parseInt(anilistId, 10) } },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    if (response.data?.errors) {
      throw new Error(response.data.errors[0]?.message || 'AniList lookup failed');
    }

    const media = response.data?.data?.Media;
    if (!media) throw new Error('No AniList result for that ID');

    return normalizeAnilistMedia(media);
  } catch (err) {
    console.error('[AniList] Error:', err.message);
    throw err;
  }
};
