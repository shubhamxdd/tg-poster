import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  originalTitle: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['movie', 'series', 'anime'],
    default: 'movie',
  },
  link: {
    type: String,
  },
  links: [{
    label:    { type: String, default: 'Download' },
    url:      { type: String, required: true },
    quality:  String,      // e.g. "1080p", "2160p"
    size:     String,      // e.g. "19.76GB"
    season:   Number,      // e.g. 1, 2
    episode:  Number,      // e.g. 1, 2 (for episode-wise links)
    filename: String,      // The full raw filename line
    source:   { type: String, default: null },  // e.g. "GDFlix", "Pixeldrain", "Telegram"
    priority: { type: String, enum: ['primary', 'backup'], default: 'primary' },
    health:   { type: String, enum: ['working', 'broken', 'unverified'], default: 'unverified' },
  }],
  poster: {
    type: String,
    default: '',
  },
  backdrop: {
    type: String,
    default: '',
  },
  genre: {
    type: [String],
    default: [],
  },
  year: {
    type: Number,
    default: null,
  },
  audio: {
    type: [String],
    default: [],
  },
  description: {
    type: String,
    default: '',
  },
  rating: String,
  runtime: String,
  status: String,
  country: String,
  director: String,
  cast: [{
    name: String,
    character: String,
    profile_path: String
  }],
  rawMessage: {
    type: String,
    default: '',
  },
  telegramMsgId: {
    type: Number,
    required: true,
    unique: true,
  },
  tmdbId: {
    type: String,
    index: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      if (ret.links && Array.isArray(ret.links)) {
        ret.links = ret.links.map(l => {
          if (typeof l === 'string') return { label: 'Download', url: l };
          return l;
        });
      }
      return ret;
    }
  }
});

movieSchema.index({ updatedAt: -1 });

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
