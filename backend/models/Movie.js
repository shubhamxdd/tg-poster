import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['movie', 'series', 'anime'],
    default: 'movie',
  },
  link: {
    type: String,
    required: true,
  },
  links: [{
    label: { type: String, default: 'Download' },
    url: { type: String, required: true }
  }],
  poster: {
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
  language: {
    type: String,
    default: 'Unknown',
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

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
