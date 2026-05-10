import express from 'express';
import { getMovies, getMovieById, deleteMovie } from '../controllers/movieController.js';

const router = express.Router();

router.get('/', getMovies);
router.get('/:id', getMovieById);
router.delete('/:id', deleteMovie);

export default router;
