try {
  require('dotenv').config();
} catch (_error) {
}
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { signToken, requireAuth, requireRole } = require('./auth');

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const user = db
    .prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?')
    .get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, username, role, created_at FROM users WHERE id = ?')
    .get(req.user.id);
  return res.json({ user });
});

app.post('/api/users', requireAuth, requireRole('admin'), (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !['admin', 'editor'].includes(role)) {
    return res.status(400).json({ message: 'username, password and valid role are required' });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
      .run(username, passwordHash, role);
    return res.status(201).json({ id: result.lastInsertRowid, username, role });
  } catch (error) {
    return res.status(400).json({ message: 'Username already exists' });
  }
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  const pages = db.prepare("SELECT COUNT(*) AS count FROM content WHERE type = 'page'").get().count;
  const posts = db.prepare("SELECT COUNT(*) AS count FROM content WHERE type = 'post'").get().count;
  const banners = db.prepare('SELECT COUNT(*) AS count FROM banners').get().count;
  const menus = db.prepare('SELECT COUNT(*) AS count FROM menus').get().count;
  const media = db.prepare('SELECT COUNT(*) AS count FROM media').get().count;

  return res.json({ pages, posts, banners, menus, media });
});

function createContentHandlers(type) {
  app.get(`/api/${type}s`, requireAuth, (_req, res) => {
    const rows = db
      .prepare(
        'SELECT id, title, slug, body, status, created_at, updated_at FROM content WHERE type = ? ORDER BY updated_at DESC',
      )
      .all(type);
    return res.json(rows);
  });

  app.get(`/api/${type}s/:id`, requireAuth, (req, res) => {
    const row = db
      .prepare(
        'SELECT id, title, slug, body, status, created_at, updated_at FROM content WHERE id = ? AND type = ?',
      )
      .get(req.params.id, type);

    if (!row) {
      return res.status(404).json({ message: `${type} not found` });
    }

    return res.json(row);
  });

  app.post(`/api/${type}s`, requireAuth, requireRole('admin', 'editor'), (req, res) => {
    const { title, slug, body, status = 'draft' } = req.body;
    if (!title || !slug || !body) {
      return res.status(400).json({ message: 'title, slug and body are required' });
    }

    try {
      const result = db
        .prepare(
          'INSERT INTO content (type, title, slug, body, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(type, title, slug, body, status, req.user.id, req.user.id);
      return res.status(201).json({ id: result.lastInsertRowid });
    } catch (error) {
      return res.status(400).json({ message: `A ${type} with that slug already exists` });
    }
  });

  app.put(`/api/${type}s/:id`, requireAuth, requireRole('admin', 'editor'), (req, res) => {
    const { title, slug, body, status = 'draft' } = req.body;
    if (!title || !slug || !body) {
      return res.status(400).json({ message: 'title, slug and body are required' });
    }

    try {
      const result = db
        .prepare(
          `
          UPDATE content
          SET title = ?, slug = ?, body = ?, status = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND type = ?
        `,
        )
        .run(title, slug, body, status, req.user.id, req.params.id, type);

      if (result.changes === 0) {
        return res.status(404).json({ message: `${type} not found` });
      }

      return res.json({ message: `${type} updated` });
    } catch (error) {
      return res.status(400).json({ message: `A ${type} with that slug already exists` });
    }
  });

  app.delete(`/api/${type}s/:id`, requireAuth, requireRole('admin', 'editor'), (req, res) => {
    const result = db
      .prepare('DELETE FROM content WHERE id = ? AND type = ?')
      .run(req.params.id, type);

    if (result.changes === 0) {
      return res.status(404).json({ message: `${type} not found` });
    }

    return res.json({ message: `${type} deleted` });
  });
}

createContentHandlers('page');
createContentHandlers('post');

app.get('/api/banners', requireAuth, (_req, res) => {
  const rows = db
    .prepare('SELECT id, title, image_url, link_url, is_active, created_at, updated_at FROM banners ORDER BY updated_at DESC')
    .all();
  return res.json(rows);
});

app.post('/api/banners', requireAuth, requireRole('admin'), (req, res) => {
  const { title, image_url = '', link_url = '', is_active = 1 } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'title is required' });
  }

  const result = db
    .prepare(
      'INSERT INTO banners (title, image_url, link_url, is_active, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(title, image_url, link_url, is_active ? 1 : 0, req.user.id, req.user.id);

  return res.status(201).json({ id: result.lastInsertRowid });
});

app.put('/api/banners/:id', requireAuth, requireRole('admin'), (req, res) => {
  const { title, image_url = '', link_url = '', is_active = 1 } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'title is required' });
  }

  const result = db
    .prepare(
      `
      UPDATE banners
      SET title = ?, image_url = ?, link_url = ?, is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    )
    .run(title, image_url, link_url, is_active ? 1 : 0, req.user.id, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ message: 'banner not found' });
  }

  return res.json({ message: 'banner updated' });
});

app.delete('/api/banners/:id', requireAuth, requireRole('admin'), (req, res) => {
  const result = db.prepare('DELETE FROM banners WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'banner not found' });
  }
  return res.json({ message: 'banner deleted' });
});

app.get('/api/menus', requireAuth, (_req, res) => {
  const rows = db
    .prepare('SELECT id, name, items_json, created_at, updated_at FROM menus ORDER BY updated_at DESC')
    .all()
    .map((item) => ({ ...item, items: JSON.parse(item.items_json) }));
  return res.json(rows);
});

app.post('/api/menus', requireAuth, requireRole('admin'), (req, res) => {
  const { name, items = [] } = req.body;
  if (!name || !Array.isArray(items)) {
    return res.status(400).json({ message: 'name and items array are required' });
  }

  try {
    const result = db
      .prepare('INSERT INTO menus (name, items_json, created_by, updated_by) VALUES (?, ?, ?, ?)')
      .run(name, JSON.stringify(items), req.user.id, req.user.id);
    return res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    return res.status(400).json({ message: 'menu name must be unique' });
  }
});

app.put('/api/menus/:id', requireAuth, requireRole('admin'), (req, res) => {
  const { name, items = [] } = req.body;
  if (!name || !Array.isArray(items)) {
    return res.status(400).json({ message: 'name and items array are required' });
  }

  try {
    const result = db
      .prepare(
        `
        UPDATE menus
        SET name = ?, items_json = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      )
      .run(name, JSON.stringify(items), req.user.id, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'menu not found' });
    }

    return res.json({ message: 'menu updated' });
  } catch (error) {
    return res.status(400).json({ message: 'menu name must be unique' });
  }
});

app.delete('/api/menus/:id', requireAuth, requireRole('admin'), (req, res) => {
  const result = db.prepare('DELETE FROM menus WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ message: 'menu not found' });
  }
  return res.json({ message: 'menu deleted' });
});

app.post('/api/media/upload', requireAuth, requireRole('admin', 'editor'), upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'file is required' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  const result = db
    .prepare(
      `
      INSERT INTO media (original_name, file_name, mime_type, file_size, file_url, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    )
    .run(req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, fileUrl, req.user.id);

  return res.status(201).json({
    id: result.lastInsertRowid,
    original_name: req.file.originalname,
    file_name: req.file.filename,
    mime_type: req.file.mimetype,
    file_size: req.file.size,
    file_url: fileUrl,
  });
});

app.get('/api/media', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT id, original_name, file_name, mime_type, file_size, file_url, created_at FROM media ORDER BY created_at DESC')
    .all();
  return res.json(rows);
});

app.delete('/api/media/:id', requireAuth, requireRole('admin', 'editor'), (req, res) => {
  const media = db.prepare('SELECT id, file_name FROM media WHERE id = ?').get(req.params.id);
  if (!media) {
    return res.status(404).json({ message: 'media not found' });
  }

  db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);

  const filePath = path.join(uploadDir, media.file_name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return res.json({ message: 'media deleted' });
});

app.listen(PORT, () => {
  console.log(`CMS backend running on http://localhost:${PORT}`);
  console.log('Default admin credentials: admin / admin123');
});
