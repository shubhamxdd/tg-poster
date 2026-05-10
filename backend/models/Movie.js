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
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
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
});

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
