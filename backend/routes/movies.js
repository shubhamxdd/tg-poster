import express from 'express';
import { getMovies, getMovieById, deleteMovie, updateMovie, adminAuth } from '../controllers/movieController.js';

const router = express.Router();

router.get('/', getMovies);
router.get('/:id', getMovieById);

// Admin Protected Routes
router.put('/:id', adminAuth, updateMovie);
router.delete('/:id', adminAuth, deleteMovie);

export default router;
