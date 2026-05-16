const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── FIX: Ensure uploads directory exists before Multer tries to write ──
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for cover images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cover-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const valid = allowed.test(path.extname(file.originalname).toLowerCase());
    if (!valid) return cb(new Error('Only JPEG, JPG, PNG, WEBP images are allowed.'));
    cb(null, valid);
  }
});

// ── Multer error handler wrapper ─────────────────────────────────────
function uploadSingle(req, res, next) {
  upload.single('coverImage')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}

// GET /api/posts — list posts (with pagination, filter, search)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 6, category, tag, search, author } = req.query;
    const filter = { status: 'published' };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (author) filter.author = author;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } }
    ];

    const total = await Post.countDocuments(filter);
    const posts = await Post.find(filter)
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-comments');

    res.json({
      success: true,
      posts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      }
    });
  } catch (err) {
    console.error('GET /posts error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/posts/featured — top 1 most viewed published post
router.get('/featured', async (req, res) => {
  try {
    const post = await Post.findOne({ status: 'published' })
      .populate('author', 'name avatar')
      .sort({ views: -1 });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/posts/popular — top 4 by views
router.get('/popular', async (req, res) => {
  try {
    const posts = await Post.find({ status: 'published' })
      .populate('author', 'name')
      .sort({ views: -1 })
      .limit(4)
      .select('title slug views createdAt');
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/posts/stats — overall blog stats
router.get('/stats', async (req, res) => {
  try {
    const [totalPosts, totalAuthors] = await Promise.all([
      Post.countDocuments({ status: 'published' }),
      User.countDocuments()
    ]);
    res.json({ success: true, stats: { totalPosts, totalAuthors } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/posts/:slug — single post (increments views)
router.get('/:slug', async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { slug: req.params.slug, status: 'published' },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'name avatar bio')
     .populate('comments.author', 'name avatar');
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/posts — create post (auth required)
router.post('/', requireAuth, uploadSingle, async (req, res) => {
  try {
    const { title, content, category, tags, status } = req.body;
    if (!title || !content || !category)
      return res.status(400).json({ success: false, message: 'Title, content and category are required.' });

    const postData = {
      title,
      content,
      category,
      author: req.session.userId,
      status: status || 'published',
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };
    if (req.file) postData.coverImage = `/uploads/${req.file.filename}`;

    const post = await Post.create(postData);
    await post.populate('author', 'name avatar');
    res.status(201).json({ success: true, message: 'Post published!', post });
  } catch (err) {
    console.error('POST /posts error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/posts/:id — update post (only by author)
router.put('/:id', requireAuth, uploadSingle, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.author.toString() !== req.session.userId.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const { title, content, category, tags, status } = req.body;
    if (title) post.title = title;
    if (content) post.content = content;
    if (category) post.category = category;
    if (status) post.status = status;
    if (tags !== undefined) post.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (req.file) post.coverImage = `/uploads/${req.file.filename}`;

    await post.save();
    res.json({ success: true, message: 'Post updated!', post });
  } catch (err) {
    console.error('PUT /posts/:id error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/posts/:id — delete post (only by author)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    if (post.author.toString() !== req.session.userId.toString())
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    await post.deleteOne();
    res.json({ success: true, message: 'Post deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/posts/:id/like — toggle like
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const uid = req.session.userId.toString();
    const idx = post.likes.findIndex(l => l.toString() === uid);
    if (idx === -1) post.likes.push(req.session.userId);
    else post.likes.splice(idx, 1);
    await post.save();
    res.json({ success: true, likes: post.likes.length, liked: idx === -1 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/posts/:id/comments — add comment
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    post.comments.push({ author: req.session.userId, content });
    await post.save();
    await post.populate('comments.author', 'name avatar');
    const newComment = post.comments[post.comments.length - 1];
    res.status(201).json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;