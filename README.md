# Inkwell — Full-Stack Blogging Website

A complete blogging platform built with **Node.js**, **Express.js**, and **MongoDB**.

Here the overview of the project
https://inkwell-a-modern-blog.onrender.com

## Features
- User registration & login (session-based auth with bcrypt)
- Create, edit, delete blog posts (only by post author)
- Category filtering & full-text search
- Like posts & comment system
- Image upload for cover photos (Multer)
- Pagination for post listings
- Persistent sessions stored in MongoDB
- Responsive single-page frontend (vanilla JS)

## Project Structure
```
inkwell/
├── server.js              # Express app entry point
├── .env.example           # Environment variable template
├── models/
│   ├── User.js            # User schema (bcrypt password hashing)
│   └── Post.js            # Post schema (slug, comments, likes)
├── routes/
│   ├── auth.js            # /api/auth — register, login, logout, me
│   └── posts.js           # /api/posts — CRUD, likes, comments
├── middleware/
│   └── auth.js            # requireAuth middleware
└── public/
    ├── index.html         # SPA shell
    ├── css/style.css      # All styles
    ├── js/app.js          # Frontend SPA logic
    └── uploads/           # Uploaded cover images
```

## Setup & Installation

### 1. Prerequisites
- Node.js v18+ installed
- MongoDB running locally OR a MongoDB Atlas URI

### 2. Install dependencies
```bash
cd inkwell
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/inkwell
SESSION_SECRET=change_this_to_a_long_random_string
```

> **MongoDB Atlas:** Replace `MONGODB_URI` with your Atlas connection string:
> `mongodb+srv://user:password@cluster.mongodb.net/inkwell`

### 4. Run the app
```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Open **http://localhost:3000** in your browser.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get current user |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/posts | List posts (pagination, filter, search) |
| GET | /api/posts/featured | Get featured (most viewed) post |
| GET | /api/posts/popular | Get top 4 posts by views |
| GET | /api/posts/stats | Blog statistics |
| GET | /api/posts/:slug | Get single post |
| POST | /api/posts | Create post (auth required) |
| PUT | /api/posts/:id | Update post (author only) |
| DELETE | /api/posts/:id | Delete post (author only) |
| POST | /api/posts/:id/like | Toggle like (auth required) |
| POST | /api/posts/:id/comments | Add comment (auth required) |

Here the overview of the post
<img width="1852" height="812" alt="image" src="https://github.com/user-attachments/assets/b4fd05e5-985c-4cb3-ae1d-c11e04a83558" />
<img width="1918" height="857" alt="image" src="https://github.com/user-attachments/assets/b99fdc35-8d18-491e-be9c-87c37c6506ee" />



## Deploying to Production
1. Set `NODE_ENV=production` in `.env`
2. Use a process manager: `npm install -g pm2 && pm2 start server.js`
3. Use MongoDB Atlas for the database
4. Put Nginx in front as a reverse proxy
