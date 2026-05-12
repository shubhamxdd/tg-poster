import express from 'express';
import { getMovies, getMovieById, deleteMovie, updateMovie, adminAuth, verifyAdmin } from '../controllers/movieController.js';

const router = express.Router();

router.get('/', getMovies);
router.get('/:id', getMovieById);

// Admin Authentication Verification
router.post('/admin/verify', adminAuth, verifyAdmin);

// Admin Protected Routes
router.put('/:id', adminAuth, updateMovie);
router.delete('/:id', adminAuth, deleteMovie);

export default router;
