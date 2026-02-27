# CMS Technical Test (Node.js + React)

Basic Content Management System implementation with:

- Dashboard administration for pages, posts, banners, menus
- Full CRUD for managed content
- WYSIWYG editor for page/post content
- Media library with upload and delete support
- Role-based access control (`admin`, `editor`)

## Stack

- Backend: Node.js, Express, SQLite (`better-sqlite3`), JWT auth, Multer uploads
- Frontend: React (Vite), Axios, React Router, ReactQuill (WYSIWYG)

## Project Structure

- `backend/` – API server and SQLite database
- `frontend/` – React admin panel

## Quick Start

### 1) Run backend

```bash
cd backend
npm install
npm run start
```

Backend runs at `http://localhost:4000`.

### 2) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Default Admin Login

- Username: `admin`
- Password: `admin123`

Admin user is auto-seeded on first backend startup.

## Role-Based Access

- `admin`: full access (users, pages, posts, banners, menus, media)
- `editor`: pages/posts/media CRUD, read dashboard

## Implemented Core Features

1. **Dashboard Administration**
	- Count summary for pages, posts, banners, menus, media

2. **CRUD Functionality**
	- Pages: Create/Read/Update/Delete
	- Posts: Create/Read/Update/Delete
	- Banners: Create/Read/Update/Delete (admin)
	- Menus: Create/Read/Update/Delete (admin, JSON items)

3. **WYSIWYG Visual Editor**
	- ReactQuill editor integrated in page/post forms

4. **Media Library**
	- File upload endpoint and media listing
	- Delete media (record + file)
	- Static file access under `/uploads/*`

5. **Role-Based Access Control**
	- JWT-based authentication
	- Protected routes with role guards on backend
	- Frontend navigation visibility based on role

## API Overview

- Auth: `POST /api/auth/login`, `GET /api/auth/me`
- Dashboard: `GET /api/dashboard`
- Pages: `/api/pages`
- Posts: `/api/posts`
- Banners: `/api/banners` (admin)
- Menus: `/api/menus` (admin)
- Media: `POST /api/media/upload`, `GET /api/media`, `DELETE /api/media/:id`
- Users: `POST /api/users` (admin)

Use `Authorization: Bearer <token>` for protected endpoints.