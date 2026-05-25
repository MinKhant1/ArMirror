import { Router } from 'express';
import Photo from '../models/Photo.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const photos = await Photo.find().sort({ createdAt: -1 }).limit(50).select('-imageData');
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { themeId, imageData, playerName } = req.body;
    if (!themeId || !imageData) {
      return res.status(400).json({ error: 'themeId and imageData are required' });
    }

    const photo = await Photo.create({ themeId, imageData, playerName });
    res.status(201).json({ id: photo._id, themeId: photo.themeId, createdAt: photo.createdAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });
    res.json(photo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
