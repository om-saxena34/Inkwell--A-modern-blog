/* =============================================
   INKWELL — Frontend SPA (Redesigned)
   ============================================= */

let currentUser = null;
let currentPage = 1;
let currentCategory = '';
let currentSearch = '';

// ── API Helper ──────────────────────────────────────────────────────
async function api(method, endpoint, data = null, isForm = false) {
  const opts = { method, headers: {}, credentials: 'same-origin' };
  if (data) {
    if (isForm) {
      opts.body = data;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(data);
    }
  }
  const res = await fetch('/api' + endpoint, opts);
  return res.json();
}

// ── Toast ──────────────────────────────────────────────────────────
function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── Mobile Nav ─────────────────────────────────────────────────────
function toggleMobileNav() {
  document.getElementById('mobileNav').classList.toggle('open');
}

// ── Modal ──────────────────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// ── Auth State ─────────────────────────────────────────────────────
async function checkAuth() {
  const res = await api('GET', '/auth/me');
  currentUser = res.loggedIn ? res.user : null;
  renderNavAuth();
}

function renderNavAuth() {
  const area = document.getElementById('navAuthArea');
  const mobileArea = document.getElementById('mobileAuthArea');
  if (currentUser) {
    const html = `
      <span class="nav-user-name">Hi, ${currentUser.name.split(' ')[0]}</span>
      <button class="nav-btn-ghost btn-sm" onclick="navigate('dashboard')">My Posts</button>
      <button class="nav-btn btn-sm" onclick="openWriteModal()">+ Write</button>
      <button class="nav-btn-ghost btn-sm" onclick="logout()">Logout</button>`;
    area.innerHTML = html;
    mobileArea.innerHTML = `
      <button class="nav-btn-ghost btn-sm" onclick="navigate('dashboard');toggleMobileNav()">My Posts</button>
      <button class="nav-btn btn-sm" onclick="openWriteModal();toggleMobileNav()">+ Write</button>
      <button class="nav-btn-ghost btn-sm" onclick="logout()">Logout</button>`;
  } else {
    area.innerHTML = `
      <button class="nav-btn-ghost btn-sm" onclick="showLogin()">Log in</button>
      <button class="nav-btn btn-sm" onclick="showRegister()">Sign up</button>`;
    mobileArea.innerHTML = `
      <button class="nav-btn-ghost btn-sm" onclick="showLogin();toggleMobileNav()">Log in</button>
      <button class="nav-btn btn-sm" onclick="showRegister();toggleMobileNav()">Sign up</button>`;
  }
}

// ── Navigation ─────────────────────────────────────────────────────
function navigate(view, param = null) {
  if (view === 'home') renderHome();
  else if (view === 'articles') renderArticles();
  else if (view === 'post') renderPost(param);
  else if (view === 'dashboard') renderDashboard();
  else if (view === 'about') renderAbout();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── HOME ───────────────────────────────────────────────────────────
async function renderHome() {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="spinner">Loading your stories…</div>`;

  const [statsRes, featuredRes, postsRes, popularRes] = await Promise.all([
    api('GET', '/posts/stats'),
    api('GET', '/posts/featured'),
    api('GET', '/posts?page=1&limit=6'),
    api('GET', '/posts/popular')
  ]);

  const stats = statsRes.stats || {};
  const featured = featuredRes.post;
  const posts = postsRes.posts || [];
  const popular = popularRes.posts || [];

  app.innerHTML = `
    <!-- HERO -->
    <section class="hero">
      <div>
        <span class="hero-tag">Welcome to Inkwell</span>
        <h1>Stories that make you <em>think</em> differently.</h1>
        <p>A curated space for ideas on technology, design, culture, and the human experience.</p>
        <div class="hero-actions">
          <button class="btn-primary" onclick="navigate('articles')">Start Reading</button>
          <button class="btn-ghost" onclick="${currentUser ? 'openWriteModal()' : 'showRegister()'}">Share Your Story</button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-visual-inner">
          <div class="hero-quote">"</div>
          <p class="hero-quote-text">Writing is thinking.<br>To write well is<br>to think clearly.</p>
          <span class="hero-quote-author">— David McCullough</span>
        </div>
      </div>
    </section>

    <!-- STATS -->
    <div class="stats-strip">
      <div class="stat">
        <div class="stat-num">${stats.totalPosts || 0}</div>
        <div class="stat-label">Articles Published</div>
      </div>
      <div class="stat">
        <div class="stat-num">${stats.totalAuthors || 0}</div>
        <div class="stat-label">Active Writers</div>
      </div>
      <div class="stat">
        <div class="stat-num">7</div>
        <div class="stat-label">Topics Covered</div>
      </div>
    </div>

    <!-- MAIN LAYOUT -->
    <div class="main-layout">
      <main>
        <div class="section-title">Featured Story</div>
        ${featured ? renderFeaturedCard(featured) : '<p style="color:var(--muted)">No featured posts yet.</p>'}
        <div class="section-title">Latest Articles</div>
        <div class="posts-grid" id="postsGrid">
          ${posts.length ? posts.map(renderPostCard).join('') : '<p style="color:var(--muted);grid-column:1/-1">No posts yet. Be the first to write!</p>'}
        </div>
        <div class="load-more-wrap" id="loadMoreWrap">
          ${(postsRes.pagination && postsRes.pagination.pages > 1) ? '<button class="btn-ghost" onclick="loadMorePosts()">Load More Articles</button>' : ''}
        </div>
      </main>
      <aside class="sidebar">${renderSidebar(popular)}</aside>
    </div>
    ${renderFooter()}`;

  currentPage = 1;
  currentCategory = '';
  currentSearch = '';
}

function renderFeaturedCard(post) {
  const cover = post.coverImage
    ? `style="background-image:url('${post.coverImage}');background-size:cover;background-position:center"`
    : '';
  return `
    <div class="featured-post" onclick="navigate('post','${post.slug}')">
      <div class="featured-img" ${cover}>
        <span class="featured-img-badge">✦ Featured</span>
      </div>
      <div class="featured-body">
        <span class="post-tag">${post.category}</span>
        <h2>${post.title}</h2>
        <p>${post.excerpt || ''}</p>
        <div class="post-meta">
          <div class="avatar">${initials(post.author?.name)}</div>
          <div class="meta-text">
            <strong>${post.author?.name || 'Unknown'}</strong> &middot;
            ${post.readTime || 1} min read &middot;
            ${formatDate(post.createdAt)}
          </div>
        </div>
        <span class="read-link" style="margin-top:1rem">Read full article →</span>
      </div>
    </div>`;
}

function renderPostCard(post) {
  return `
    <div class="post-card" onclick="navigate('post','${post.slug}')">
      <span class="post-tag">${post.category}</span>
      <h3>${post.title}</h3>
      <p>${post.excerpt || ''}</p>
      <div class="card-footer">
        <span class="card-date">${formatDate(post.createdAt)}</span>
        <span class="card-read">${post.readTime || 1} min read</span>
      </div>
    </div>`;
}

function renderSidebar(popular) {
  const cats = ['Technology','Design','Culture','Philosophy','Science','Travel','Productivity'];
  const tags = ['writing','ai','creativity','design','culture','focus','books','mindfulness','travel','future','productivity','philosophy'];
  return `
    <div class="sidebar-box">
      <div class="sidebar-title">Stay in the loop</div>
      <p class="newsletter-desc">Get the best articles delivered to your inbox every Sunday.</p>
      <div class="newsletter-form">
        <input type="email" id="nlEmail" placeholder="your@email.com"/>
        <button class="btn-accent" onclick="subscribe()">Subscribe — it's free</button>
      </div>
    </div>
    <div class="sidebar-box">
      <div class="sidebar-title">Browse Topics</div>
      <ul class="cat-list">
        ${cats.map(c => `<li onclick="navigate('articles');setTimeout(()=>filterByCategory('${c}'),50)"><span class="cat-name">${c}</span></li>`).join('')}
      </ul>
    </div>
    ${popular.length ? `
    <div class="sidebar-box">
      <div class="sidebar-title">Most Read</div>
      <div class="popular-list">
        ${popular.map((p,i) => `
          <div class="popular-item" onclick="navigate('post','${p.slug}')">
            <div class="popular-num">0${i+1}</div>
            <div class="popular-text">
              <h4>${p.title}</h4>
              <span>${p.views} views</span>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}
    <div class="sidebar-box">
      <div class="sidebar-title">Tags</div>
      <div class="tags-cloud">
        ${tags.map(t => `<span class="tag-pill" onclick="navigate('articles');setTimeout(()=>searchByTag('${t}'),50)">${t}</span>`).join('')}
      </div>
    </div>`;
}

// ── ARTICLES PAGE ──────────────────────────────────────────────────
async function renderArticles(category = '', search = '') {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="spinner">Loading articles…</div>`;

  currentCategory = category;
  currentSearch = search;
  currentPage = 1;

  const params = new URLSearchParams({ page: 1, limit: 9 });
  if (category) params.set('category', category);
  if (search) params.set('search', search);

  const res = await api('GET', `/posts?${params}`);
  const cats = ['All','Technology','Design','Culture','Philosophy','Science','Travel','Productivity'];

  app.innerHTML = `
    <div class="articles-page">
      <span class="hero-tag">All Articles</span>
      <h1 style="margin:1rem 0 0.5rem">Explore Every Story</h1>
      <p style="color:var(--muted);margin-bottom:2rem;font-size:1rem">Discover ideas across all of our topics and writers.</p>
      <div class="search-bar">
        <input type="text" id="searchInput" placeholder="Search articles by title or topic…" value="${search}"
          onkeydown="if(event.key==='Enter')doSearch()"/>
        <button class="btn-primary" onclick="doSearch()">Search</button>
      </div>
      <div class="filter-bar">
        ${cats.map(c => `<button class="filter-btn ${(c==='All'&&!category)||(c===category)?'active':''}" onclick="filterByCategory('${c==='All'?'':c}')">${c}</button>`).join('')}
      </div>
      <div class="posts-grid" id="articlesGrid">
        ${res.posts?.length
          ? res.posts.map(renderPostCard).join('')
          : '<div class="empty-state" style="grid-column:1/-1"><h3>No articles found</h3><p>Try a different search or category.</p></div>'}
      </div>
      <div class="load-more-wrap" id="articlesLoadMore">
        ${(res.pagination?.pages > 1) ? '<button class="btn-ghost" onclick="loadMoreArticles()">Load More</button>' : ''}
      </div>
    </div>
    ${renderFooter()}`;
}

function doSearch() {
  const val = document.getElementById('searchInput')?.value.trim();
  renderArticles(currentCategory, val);
}

function filterByCategory(cat) {
  renderArticles(cat, currentSearch);
}

function searchByTag(tag) {
  renderArticles('', tag);
}

async function loadMoreArticles() {
  currentPage++;
  const params = new URLSearchParams({ page: currentPage, limit: 9 });
  if (currentCategory) params.set('category', currentCategory);
  if (currentSearch) params.set('search', currentSearch);
  const res = await api('GET', `/posts?${params}`);
  const grid = document.getElementById('articlesGrid');
  if (res.posts?.length) {
    grid.insertAdjacentHTML('beforeend', res.posts.map(renderPostCard).join(''));
    if (currentPage >= res.pagination.pages)
      document.getElementById('articlesLoadMore').innerHTML = '';
  }
}

async function loadMorePosts() {
  currentPage++;
  const res = await api('GET', `/posts?page=${currentPage}&limit=6`);
  if (res.posts?.length) {
    document.getElementById('postsGrid').insertAdjacentHTML('beforeend', res.posts.map(renderPostCard).join(''));
    if (currentPage >= res.pagination.pages)
      document.getElementById('loadMoreWrap').innerHTML = '';
  }
}

// ── SINGLE POST ────────────────────────────────────────────────────
async function renderPost(slug) {
  const app = document.getElementById('app');
  app.innerHTML = `<div class="spinner">Loading post…</div>`;

  const res = await api('GET', `/posts/${slug}`);
  if (!res.success || !res.post) {
    app.innerHTML = `
      <div class="empty-state">
        <h3>Post not found</h3>
        <p>It may have been removed.</p><br>
        <button class="btn-primary" onclick="navigate('home')">Go Home</button>
      </div>`;
    return;
  }

  const post = res.post;
  const liked = currentUser && post.likes?.map(String).includes(String(currentUser._id));

  app.innerHTML = `
    <div class="post-view">
      <div class="back-link" onclick="navigate('articles')">← Back to Articles</div>
      ${post.coverImage ? `<img class="post-view-cover" src="${post.coverImage}" alt="${post.title}"/>` : ''}
      <div class="post-view-header">
        <span class="post-tag">${post.category}</span>
        <h1>${post.title}</h1>
        <div class="post-view-meta">
          <div class="avatar">${initials(post.author?.name)}</div>
          <strong>${post.author?.name || 'Unknown'}</strong>
          <span>·</span><span>${formatDate(post.createdAt)}</span>
          <span>·</span><span>${post.readTime || 1} min read</span>
          <span>·</span><span>${post.views} views</span>
        </div>
      </div>
      <div class="post-view-content">${renderContent(post.content)}</div>
      <div class="post-actions">
        <button class="like-btn ${liked?'liked':''}" id="likeBtn" onclick="toggleLike('${post._id}')">
          ♥ <span id="likeCount">${post.likes?.length || 0}</span> Likes
        </button>
        <span style="color:var(--muted);font-size:0.85rem">${post.comments?.length || 0} comments</span>
      </div>
      <div class="comments-section">
        <h3>Comments (${post.comments?.length || 0})</h3>
        ${currentUser ? `
          <div class="comment-form">
            <textarea id="commentText" placeholder="Share your thoughts on this story…"></textarea>
            <div><button class="btn-primary btn-sm" onclick="addComment('${post._id}')">Post Comment</button></div>
          </div>` : `
          <p style="color:var(--muted);margin-bottom:1.5rem">
            <a onclick="showLogin()" style="color:var(--gold);cursor:pointer;text-decoration:underline;text-underline-offset:3px">Log in</a> to leave a comment.
          </p>`}
        <div class="comment-list" id="commentList">
          ${(post.comments||[]).map(renderComment).join('')}
        </div>
      </div>
    </div>
    ${renderFooter()}`;
}

function renderContent(text) {
  return text.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('');
}

function renderComment(c) {
  return `
    <div class="comment-item">
      <div class="comment-author">
        ${c.author?.name || 'Anonymous'}
        <span class="comment-date">${formatDate(c.createdAt)}</span>
      </div>
      <div class="comment-body">${c.content}</div>
    </div>`;
}

async function toggleLike(postId) {
  if (!currentUser) { showLogin(); return; }
  const res = await api('POST', `/posts/${postId}/like`);
  if (res.success) {
    document.getElementById('likeCount').textContent = res.likes;
    document.getElementById('likeBtn').classList.toggle('liked', res.liked);
  }
}

async function addComment(postId) {
  const content = document.getElementById('commentText')?.value.trim();
  if (!content) { showToast('Comment cannot be empty.'); return; }
  const res = await api('POST', `/posts/${postId}/comments`, { content });
  if (res.success) {
    document.getElementById('commentList').insertAdjacentHTML('afterbegin', renderComment(res.comment));
    document.getElementById('commentText').value = '';
    showToast('✓ Comment posted!');
  } else showToast(res.message);
}

// ── WRITE / EDIT POST ──────────────────────────────────────────────
function openWriteModal(post = null) {
  if (!currentUser) { showLogin(); return; }
  const cats = ['Technology','Design','Culture','Philosophy','Science','Travel','Productivity'];
  openModal(`
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2>${post ? 'Edit Post' : 'Write a New Post'}</h2>
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="wTitle" value="${post?.title||''}" placeholder="Give your story a great headline…"/>
    </div>
    <div class="form-group">
      <label>Category</label>
      <select id="wCat">
        ${cats.map(c=>`<option value="${c}" ${post?.category===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Content</label>
      <textarea id="wContent" style="min-height:200px" placeholder="Tell your story…">${post?.content||''}</textarea>
    </div>
    <div class="form-group">
      <label>Tags (comma separated)</label>
      <input type="text" id="wTags" value="${post?.tags?.join(',')||''}" placeholder="e.g. writing, ai, design"/>
    </div>
    <div class="form-group">
      <label>Cover Image (optional, max 5MB)</label>
      <input type="file" id="wImg" accept="image/jpeg,image/jpg,image/png,image/webp" style="padding:8px"/>
    </div>
    <div class="modal-actions">
      <button class="btn-accent" onclick="${post ? `updatePost('${post._id}')` : 'submitPost()'}">${post ? 'Save Changes' : 'Publish'}</button>
      <button class="btn-ghost" onclick="closeModal()">Cancel</button>
    </div>`);
}

async function submitPost() {
  const title = document.getElementById('wTitle').value.trim();
  const category = document.getElementById('wCat').value;
  const content = document.getElementById('wContent').value.trim();
  const tags = document.getElementById('wTags').value;
  const imgFile = document.getElementById('wImg').files[0];

  if (!title || !content) { showToast('Title and content are required.'); return; }
  if (!category) { showToast('Please select a category.'); return; }

  const fd = new FormData();
  fd.append('title', title);
  fd.append('category', category);
  fd.append('content', content);
  fd.append('tags', tags);
  if (imgFile) fd.append('coverImage', imgFile);

  showToast('Publishing…');
  const res = await api('POST', '/posts', fd, true);
  if (res.success) {
    closeModal();
    showToast('✓ Post published!');
    navigate('post', res.post.slug);
  } else {
    showToast(res.message || 'Failed to publish.');
  }
}

async function updatePost(id) {
  const title = document.getElementById('wTitle').value.trim();
  const category = document.getElementById('wCat').value;
  const content = document.getElementById('wContent').value.trim();
  const tags = document.getElementById('wTags').value;
  const imgFile = document.getElementById('wImg').files[0];

  const fd = new FormData();
  if (title) fd.append('title', title);
  fd.append('category', category);
  if (content) fd.append('content', content);
  fd.append('tags', tags);
  if (imgFile) fd.append('coverImage', imgFile);

  showToast('Saving…');
  const res = await api('PUT', `/posts/${id}`, fd, true);
  if (res.success) {
    closeModal();
    showToast('✓ Post updated!');
    navigate('post', res.post.slug);
  } else {
    showToast(res.message || 'Update failed.');
  }
}

async function deletePost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  const res = await api('DELETE', `/posts/${id}`);
  if (res.success) { showToast('Post deleted.'); navigate('dashboard'); }
  else showToast(res.message || 'Delete failed.');
}

// ── DASHBOARD ─────────────────────────────────────────────────────
async function renderDashboard() {
  if (!currentUser) { showLogin(); return; }
  const app = document.getElementById('app');
  app.innerHTML = `<div class="spinner">Loading dashboard…</div>`;
  const res = await api('GET', `/posts?author=${currentUser._id}&limit=50`);
  const posts = res.posts || [];

  app.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-header">
        <div class="avatar-lg">${initials(currentUser.name)}</div>
        <div>
          <div class="dashboard-name">${currentUser.name}</div>
          <div class="dashboard-bio">${currentUser.email}</div>
          <div style="margin-top:0.75rem">
            <button class="btn-accent btn-sm" onclick="openWriteModal()">+ New Post</button>
          </div>
        </div>
      </div>
      <div class="section-title">My Posts</div>
      <div class="my-posts-list">
        ${posts.length
          ? posts.map(p => `
            <div class="my-post-row">
              <div>
                <div class="my-post-title" onclick="navigate('post','${p.slug}')">${p.title}</div>
                <div class="my-post-meta">${p.category} · ${formatDate(p.createdAt)} · ${p.views} views · ${p.likes?.length||0} likes</div>
              </div>
              <div class="my-post-actions">
                <button class="nav-btn-ghost btn-sm" onclick="editPost('${p._id}','${p.slug}')">Edit</button>
                <button class="btn-danger" onclick="deletePost('${p._id}')">Delete</button>
              </div>
            </div>`).join('')
          : `<div class="empty-state">
               <h3>No posts yet</h3>
               <p>Share your first story with the world.</p>
               <br><button class="btn-accent" onclick="openWriteModal()">Write Your First Post</button>
             </div>`}
      </div>
    </div>
    ${renderFooter()}`;
}

async function editPost(id, slug) {
  const res = await api('GET', `/posts/${slug}`);
  if (res.success) openWriteModal(res.post);
}

// ── ABOUT ─────────────────────────────────────────────────────────
function renderAbout() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="about-page">
      <span class="hero-tag">About Us</span>
      <h1>We believe great writing changes minds.</h1>
      <p>Inkwell is a platform for thinkers, writers, and curious people. Our mission is to make thoughtful long-form writing accessible to everyone — as both a reader and a creator.</p>
      <p>We cover technology, design, culture, philosophy, science, travel, and productivity. Every article is written by a real person with something meaningful to say.</p>
      <p>Join thousands of readers and writers who call Inkwell home. Sign up, start writing, and share your perspective with the world.</p>
      <div style="margin-top:2.5rem">
        <button class="btn-accent" onclick="${currentUser ? 'openWriteModal()' : 'showRegister()'}">
          ${currentUser ? 'Write a Post' : 'Join Inkwell'}
        </button>
      </div>
    </div>
    ${renderFooter()}`;
}

// ── AUTH ───────────────────────────────────────────────────────────
function showLogin() {
  openModal(`
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2>Welcome back</h2>
    <div class="form-group">
      <label>Email</label>
      <input type="email" id="loginEmail" placeholder="you@example.com"/>
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="loginPass" placeholder="Your password"
        onkeydown="if(event.key==='Enter')doLogin()"/>
    </div>
    <div class="modal-actions">
      <button class="btn-accent" onclick="doLogin()" style="width:100%">Log in</button>
    </div>
    <div class="modal-switch">Don't have an account? <a onclick="showRegister()">Sign up</a></div>`);
}

function showRegister() {
  openModal(`
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2>Create your account</h2>
    <div class="form-group">
      <label>Full Name</label>
      <input type="text" id="regName" placeholder="Jane Doe"/>
    </div>
    <div class="form-group">
      <label>Email</label>
      <input type="email" id="regEmail" placeholder="you@example.com"/>
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="regPass" placeholder="At least 6 characters"/>
    </div>
    <div class="form-group">
      <label>Bio (optional)</label>
      <textarea id="regBio" style="min-height:80px" placeholder="Tell readers a little about yourself…"></textarea>
    </div>
    <div class="modal-actions">
      <button class="btn-accent" onclick="doRegister()" style="width:100%">Create Account</button>
    </div>
    <div class="modal-switch">Already have an account? <a onclick="showLogin()">Log in</a></div>`);
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;
  if (!email || !password) { showToast('All fields required.'); return; }
  const res = await api('POST', '/auth/login', { email, password });
  if (res.success) {
    currentUser = res.user;
    renderNavAuth();
    closeModal();
    showToast(`✓ Welcome back, ${res.user.name.split(' ')[0]}!`);
    navigate('home');
  } else showToast(res.message || 'Login failed.');
}

async function doRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  const bio = document.getElementById('regBio').value.trim();
  if (!name || !email || !password) { showToast('Name, email and password required.'); return; }
  const res = await api('POST', '/auth/register', { name, email, password, bio });
  if (res.success) {
    currentUser = res.user;
    renderNavAuth();
    closeModal();
    showToast(`✓ Welcome to Inkwell, ${res.user.name.split(' ')[0]}!`);
    navigate('home');
  } else showToast(res.message || 'Registration failed.');
}

async function logout() {
  await api('POST', '/auth/logout');
  currentUser = null;
  renderNavAuth();
  showToast('Logged out successfully.');
  navigate('home');
}

// ── FOOTER ─────────────────────────────────────────────────────────
function renderFooter() {
  return `
    <footer>
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="#" class="logo" onclick="navigate('home');return false;">Ink<em>well</em></a>
          <p class="footer-desc">A home for curious thinkers and passionate writers.</p>
        </div>
        <div class="footer-col">
          <h5>Explore</h5>
          <ul>
            <li><a href="#" onclick="navigate('articles');return false;">All Articles</a></li>
            <li><a href="#" onclick="navigate('home');return false;">Featured</a></li>
            <li><a href="#" onclick="navigate('about');return false;">About</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Write</h5>
          <ul>
            <li><a href="#" onclick="${currentUser ? 'openWriteModal()' : 'showRegister()'};return false;">${currentUser ? 'New Post' : 'Join as Writer'}</a></li>
            <li><a href="#" onclick="${currentUser ? "navigate('dashboard')" : 'showLogin()'};return false;">${currentUser ? 'My Posts' : 'Log In'}</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Inkwell. All rights reserved.</span>
        <span></span>
      </div>
    </footer>`;
}

// ── HELPERS ────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function subscribe() {
  const email = document.getElementById('nlEmail')?.value.trim();
  if (!email || !email.includes('@')) { showToast('Please enter a valid email.'); return; }
  document.getElementById('nlEmail').value = '';
  showToast('✓ Subscribed! See you Sunday.');
}

// ── INIT ───────────────────────────────────────────────────────────
(async () => {
  await checkAuth();
  navigate('home');
})();