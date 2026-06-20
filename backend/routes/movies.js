import express from 'express';
import { getMovies, getMovieById, deleteMovie, updateMovie, adminAuth, verifyAdmin, fetchFromTmdbUrl, fetchFromImdbUrl, fetchFromMdlUrl, bulkUpdateDescriptions, parseManual, saveManual, searchTmdbCandidates, fetchTmdbById, fixLinkTypes, getPinned, pinMovie, unpinMovie } from '../controllers/movieController.js';

const router = express.Router();

router.get('/', getMovies);
router.get('/admin/tmdb-fetch', adminAuth, fetchFromTmdbUrl);
router.get('/admin/imdb-fetch', adminAuth, fetchFromImdbUrl);
router.get('/admin/mdl-fetch', adminAuth, fetchFromMdlUrl);
router.get('/admin/tmdb-search', adminAuth, searchTmdbCandidates);
router.get('/admin/tmdb-by-id', adminAuth, fetchTmdbById);
router.post('/admin/bulk-update-descriptions', adminAuth, bulkUpdateDescriptions);
router.post('/admin/parse-manual', adminAuth, parseManual);
router.post('/admin/save-manual', adminAuth, saveManual);
router.post('/admin/fix-link-types', adminAuth, fixLinkTypes);
router.get('/admin/pinned', adminAuth, getPinned);
router.put('/admin/:id/pin', adminAuth, pinMovie);
router.put('/admin/:id/unpin', adminAuth, unpinMovie);
router.get('/:id', getMovieById);

// Admin Authentication Verification
router.post('/admin/verify', adminAuth, verifyAdmin);

// Admin Protected Routes
router.put('/:id', adminAuth, updateMovie);
router.delete('/:id', adminAuth, deleteMovie);

export default router;