/* THE SIGNAL — Page Renderers */

/* =============================================
   HOME PAGE (original transmission + blog feed)
   ============================================= */
registerRoute('/', async function(params, container) {
  container.innerHTML = '<div class="loading-state"><span class="mono-label dim">Loading transmission...</span></div>';

  let posts = [];
  try {
    posts = await fetchPublishedPosts(10);
  } catch (e) {
    console.error('Failed to load posts:', e);
  }

  container.innerHTML = renderHomePage(posts);
  initScrollReveal();
  initNewsletterForm();
});

function renderHomePage(posts) {
  const postsHtml = posts.length > 0 ? `
    <section class="dispatch" id="transmissions">
      <div class="dispatch-inner">
        <div class="section-marker">
          <span class="section-numeral">◈</span>
          <span class="section-label">TRANSMISSIONS</span>
        </div>
        <div class="posts-grid">
          ${posts.map(renderPostCard).join('')}
        </div>
      </div>
    </section>
  ` : '';

  return `
    <!-- Hero -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-overline">
          <span class="mono-label">◈ PERSONAL TRANSMISSION ◈</span>
        </div>
        <h1 class="hero-title">
          <span class="hero-title-line">The Cathedral</span>
          <span class="hero-title-line accent">Holds.</span>
        </h1>
        <div class="hero-meta">
          <span class="mono-label">WEEK №13 · 2026</span>
          <span class="mono-label dim">MARCH 20–26, 2026</span>
        </div>
        <p class="hero-quote">"Build the cathedral. Light it from within."</p>
      </div>
      <div class="hero-scanline" aria-hidden="true"></div>
    </section>

    <!-- Status Bar -->
    <section class="status-bar">
      <div class="status-inner">
        <div class="status-item">
          <span class="status-label">STACK UPTIME</span>
          <span class="status-value">100%</span>
          <span class="status-detail">GCP / Cloud Run</span>
        </div>
        <div class="status-item">
          <span class="status-label">WORKFLOWS</span>
          <span class="status-value">Active</span>
          <span class="status-detail">n8n · self-hosted</span>
        </div>
        <div class="status-item">
          <span class="status-label">AUTOMATIONS</span>
          <span class="status-value">Live</span>
          <span class="status-detail">MailerLite · 3 groups</span>
        </div>
        <div class="status-item">
          <span class="status-label">INKVAULT</span>
          <span class="status-value gold">230+</span>
          <span class="status-detail">&nbsp;</span>
        </div>
        <div class="status-item">
          <span class="status-label">FORGE3D</span>
          <span class="status-value gold">Prod.</span>
          <span class="status-detail">&nbsp;</span>
        </div>
        <div class="status-item">
          <span class="status-label">HUNTED</span>
          <span class="status-value gold">Ships.</span>
          <span class="status-detail">&nbsp;</span>
        </div>
      </div>
    </section>

    ${postsHtml}

    <!-- Newsletter CTA -->
    ${renderNewsletterSection()}

    <!-- Entity Footer Card -->
    <section class="entity-card">
      <div class="entity-inner">
        <div class="entity-row">
          <span class="entity-key">ENTITY</span>
          <span class="entity-val">1COMMERCE LLC</span>
        </div>
        <div class="entity-row">
          <span class="entity-key">PHASE</span>
          <span class="entity-val gold-text">REVENUE ACTIVATION</span>
        </div>
        <div class="entity-row">
          <span class="entity-key">LOCATION</span>
          <span class="entity-val">CANBY, OR</span>
        </div>
        <div class="entity-row">
          <span class="entity-key">STACK</span>
          <span class="entity-val">GCP · REACT · N8N · FIREBASE</span>
        </div>
        <div class="entity-row">
          <span class="entity-key">STATUS</span>
          <span class="entity-val gold-text">OPERATIONAL</span>
        </div>
      </div>
    </section>
  `;
}

function renderPostCard(post) {
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  }) : '';
  const author = post.signal_profiles ? post.signal_profiles.display_name : 'Unknown';
  const tags = (post.tags || []).slice(0, 3).map(t => `<span class="post-tag">${t}</span>`).join('');

  return `
    <article class="post-card" onclick="navigateTo('/post/${post.slug}')">
      ${post.cover_image_url ? `<div class="post-card-image" style="background-image: url('${post.cover_image_url}')"></div>` : ''}
      <div class="post-card-content">
        <div class="post-card-meta">
          <span class="mono-label dim">${date}</span>
          <span class="mono-label dim">·</span>
          <span class="mono-label dim">${author}</span>
        </div>
        <h2 class="post-card-title">${post.title}</h2>
        <p class="post-card-excerpt">${post.excerpt}</p>
        <div class="post-card-footer">
          <div class="post-card-tags">${tags}</div>
          <div class="post-card-stats">
            <span class="mono-label dim" title="Views">${post.view_count || 0} views</span>
            <span class="mono-label dim" title="Reposts">${post.repost_count || 0} shares</span>
          </div>
        </div>
      </div>
    </article>
  `;
}


/* =============================================
   BLOG LISTING PAGE
   ============================================= */
registerRoute('/blog', async function(params, container) {
  container.innerHTML = '<div class="loading-state"><span class="mono-label dim">Loading transmissions...</span></div>';

  let posts = [];
  try {
    posts = await fetchPublishedPosts(50);
  } catch (e) {
    console.error('Failed to load posts:', e);
  }

  container.innerHTML = `
    <section class="page-header">
      <div class="page-header-inner">
        <span class="mono-label accent-text">◈ ALL TRANSMISSIONS</span>
        <h1 class="page-title">The Archive</h1>
        <p class="page-description">Every dispatch, field note, and transmission from the cathedral construction site.</p>
      </div>
    </section>
    <section class="dispatch">
      <div class="dispatch-inner">
        ${posts.length > 0
          ? `<div class="posts-grid">${posts.map(renderPostCard).join('')}</div>`
          : '<p class="mono-label dim" style="text-align:center;padding:var(--space-16) 0;">No transmissions yet. The first signal is incoming.</p>'}
      </div>
    </section>
    ${renderNewsletterSection()}
  `;
  initScrollReveal();
  initNewsletterForm();
});


/* =============================================
   SINGLE POST PAGE
   ============================================= */
registerRoute('/post/:slug', async function(params, container) {
  container.innerHTML = '<div class="loading-state"><span class="mono-label dim">Loading transmission...</span></div>';

  // Track referral if present
  if (params.ref) {
    try {
      const sb = getSupabase();
      await sb.from('signal_reposts')
        .update({ click_count: sb.rpc ? undefined : 1 })
        .eq('referral_code', params.ref);
    } catch (e) { /* silent */ }
  }

  let post;
  try {
    post = await fetchPostBySlug(params.slug);
  } catch (e) {
    container.innerHTML = renderErrorPage('Transmission Not Found', 'This signal has been lost or was never sent.');
    return;
  }

  const date = post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }) : '';
  const author = post.signal_profiles ? post.signal_profiles : { display_name: 'Unknown', bio: '' };
  const tags = (post.tags || []).map(t => `<span class="post-tag">${t}</span>`).join('');
  const contentHtml = renderMarkdown(post.content);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "datePublished": post.published_at,
    "dateModified": post.updated_at,
    "author": {
      "@type": "Person",
      "name": author.display_name
    },
    "publisher": {
      "@type": "Organization",
      "name": "THE SIGNAL — 1Commerce LLC",
      "url": "https://th3signal.netlify.app"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://th3signal.netlify.app/#/post/${post.slug}`
    },
    "creator": {
      "@type": "SoftwareApplication",
      "name": "Perplexity Computer",
      "url": "https://www.perplexity.ai/computer"
    }
  };

  // Update page title and meta
  document.title = `${post.title} — THE SIGNAL`;
  updateMetaTags({
    title: post.title + ' — THE SIGNAL',
    description: post.excerpt,
    url: `https://th3signal.netlify.app/#/post/${post.slug}`,
    image: post.cover_image_url || 'https://th3signal.netlify.app/og-image.svg'
  });

  container.innerHTML = `
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    <article class="single-post">
      <header class="post-hero">
        <div class="post-hero-inner">
          <span class="mono-label accent-text">◈ TRANSMISSION</span>
          <h1 class="post-hero-title">${post.title}</h1>
          <div class="post-hero-meta">
            <span class="mono-label">${date}</span>
            <span class="mono-label dim">·</span>
            <span class="mono-label">${author.display_name}</span>
          </div>
          <div class="post-tags-row">${tags}</div>
        </div>
      </header>

      ${post.cover_image_url ? `<div class="post-cover-image"><img src="${post.cover_image_url}" alt="${post.title}" loading="lazy"></div>` : ''}

      <div class="post-content dispatch-inner">
        ${contentHtml}
      </div>

      <!-- Share / Repost Section -->
      <section class="share-section">
        <div class="share-inner">
          <div class="share-header">
            <span class="mono-label accent-text">◈ AMPLIFY THE SIGNAL</span>
            <p class="share-description">Share this transmission and earn reputation. Every repost strengthens the frequency.</p>
          </div>
          <div class="share-buttons" data-post-id="${post.id}" data-post-slug="${post.slug}">
            <button class="share-btn" onclick="handleShare('${post.id}', '${post.slug}', 'twitter')" title="Share on X/Twitter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span>Share on X</span>
            </button>
            <button class="share-btn" onclick="handleShare('${post.id}', '${post.slug}', 'linkedin')" title="Share on LinkedIn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
              <span>LinkedIn</span>
            </button>
            <button class="share-btn" onclick="handleShare('${post.id}', '${post.slug}', 'copy_link')" title="Copy link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span>Copy Link</span>
            </button>
            <button class="share-btn" onclick="handleShare('${post.id}', '${post.slug}', 'email')" title="Share via email">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <span>Email</span>
            </button>
          </div>
          <div class="share-reward-hint">
            <span class="mono-label dim">Share 3+ posts to earn the <span class="gold-text">Signal Amplifier</span> badge</span>
          </div>
        </div>
      </section>

      <!-- Author Card -->
      <section class="author-card-section">
        <div class="author-card">
          <div class="author-avatar">${author.display_name.charAt(0).toUpperCase()}</div>
          <div class="author-info">
            <h3 class="author-name">${author.display_name}</h3>
            <p class="author-bio">${author.bio || ''}</p>
          </div>
        </div>
      </section>
    </article>

    ${renderNewsletterSection()}
  `;

  initNewsletterForm();
});


/* =============================================
   AUTH PAGE (Login / Signup)
   ============================================= */
registerRoute('/auth', async function(params, container) {
  const user = await getUser();
  if (user) {
    navigateTo('/dashboard');
    return;
  }

  const mode = params.mode || 'login';
  container.innerHTML = renderAuthPage(mode);
  initAuthForm(mode);
});

registerRoute('/auth/callback', async function(params, container) {
  container.innerHTML = '<div class="loading-state"><span class="mono-label dim">Verifying signal identity...</span></div>';
  // Supabase handles the callback automatically via URL params
  setTimeout(() => navigateTo('/dashboard'), 1500);
});

function renderAuthPage(mode) {
  const isLogin = mode === 'login';
  return `
    <section class="auth-page">
      <div class="auth-container">
        <div class="auth-header">
          <span class="mono-label accent-text">◈ ${isLogin ? 'AUTHENTICATE' : 'JOIN THE FREQUENCY'} ◈</span>
          <h1 class="auth-title">${isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p class="auth-subtitle">${isLogin
            ? 'Enter your credentials to access the signal.'
            : 'Join the cathedral builders. Post your own transmissions.'}</p>
        </div>

        <form class="auth-form" id="authForm">
          ${!isLogin ? `
            <div class="form-field">
              <label class="form-label mono-label" for="displayName">Display Name</label>
              <input type="text" id="displayName" name="displayName" class="form-input" placeholder="Your signal callsign" required>
            </div>
          ` : ''}

          <div class="form-field">
            <label class="form-label mono-label" for="authEmail">Email</label>
            <input type="email" id="authEmail" name="email" class="form-input" placeholder="your@email.com" required>
          </div>

          <div class="form-field">
            <label class="form-label mono-label" for="authPassword">Password</label>
            <input type="password" id="authPassword" name="password" class="form-input" placeholder="${isLogin ? '••••••••' : 'Min 6 characters'}" minlength="6" required>
          </div>

          <div class="auth-error" id="authError" style="display:none;"></div>

          <button type="submit" class="auth-submit-btn">
            <span class="btn-text">${isLogin ? 'Enter The Signal' : 'Join The Signal'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-arrow"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </form>

        <div class="auth-footer">
          <span class="mono-label dim">${isLogin ? 'No account?' : 'Already a builder?'}</span>
          <a href="#/auth?mode=${isLogin ? 'signup' : 'login'}" class="mono-label accent-text auth-switch">
            ${isLogin ? 'Create one →' : 'Log in →'}
          </a>
        </div>
      </div>
    </section>
  `;
}

function initAuthForm(mode) {
  const form = document.getElementById('authForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('authError');
    const btn = form.querySelector('.auth-submit-btn');
    const btnText = btn.querySelector('.btn-text');
    const origText = btnText.textContent;

    errorDiv.style.display = 'none';
    btnText.textContent = 'Processing...';
    btn.disabled = true;

    try {
      const email = form.querySelector('#authEmail').value;
      const password = form.querySelector('#authPassword').value;

      if (mode === 'signup') {
        const displayName = form.querySelector('#displayName').value;
        await signUp(email, password, displayName);
        errorDiv.style.display = 'block';
        errorDiv.className = 'auth-success';
        errorDiv.textContent = 'Check your email for a confirmation link.';
        btnText.textContent = 'Email Sent ✓';
      } else {
        await signIn(email, password);
        navigateTo('/dashboard');
      }
    } catch (err) {
      errorDiv.style.display = 'block';
      errorDiv.className = 'auth-error';
      errorDiv.textContent = err.message || 'Authentication failed';
      btnText.textContent = origText;
      btn.disabled = false;
    }
  });
}


/* =============================================
   DASHBOARD (User's posts & profile)
   ============================================= */
registerRoute('/dashboard', async function(params, container) {
  const user = await getUser();
  if (!user) {
    navigateTo('/auth?mode=login');
    return;
  }

  container.innerHTML = '<div class="loading-state"><span class="mono-label dim">Loading dashboard...</span></div>';

  const profile = await getUserProfile(user.id);
  let myPosts = [];
  try {
    myPosts = await fetchMyPosts();
  } catch (e) { /* empty */ }

  container.innerHTML = `
    <section class="page-header">
      <div class="page-header-inner">
        <span class="mono-label accent-text">◈ COMMAND CENTER</span>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-description">Your signal, your posts, your frequency.</p>
      </div>
    </section>

    <section class="dashboard-section">
      <div class="dispatch-inner">
        <!-- Profile Card -->
        <div class="dashboard-profile">
          <div class="profile-avatar-large">${(profile?.display_name || user.email).charAt(0).toUpperCase()}</div>
          <div class="profile-info">
            <h2>${profile?.display_name || user.email.split('@')[0]}</h2>
            <span class="mono-label dim">${profile?.role || 'reader'} · ${profile?.reputation_score || 0} rep · ${profile?.repost_count || 0} shares</span>
          </div>
          <button class="btn-secondary" onclick="handleSignOut()">Sign Out</button>
        </div>

        <!-- Quick Actions -->
        <div class="dashboard-actions">
          <a href="#/write" class="action-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span class="action-card-title">New Transmission</span>
            <span class="mono-label dim">Write a new post</span>
          </a>
          <a href="#/blog" class="action-card">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span class="action-card-title">All Transmissions</span>
            <span class="mono-label dim">Browse the archive</span>
          </a>
        </div>

        <!-- My Posts -->
        <div class="dashboard-posts">
          <h3 class="mono-label" style="margin-bottom: var(--space-4);">YOUR TRANSMISSIONS</h3>
          ${myPosts.length > 0 ? myPosts.map(p => `
            <div class="dashboard-post-row">
              <div class="dashboard-post-info">
                <span class="dashboard-post-status status-${p.status}">${p.status}</span>
                <a href="#/post/${p.slug}" class="dashboard-post-title">${p.title}</a>
              </div>
              <div class="dashboard-post-actions">
                <a href="#/write?edit=${p.id}" class="mono-label dim">Edit</a>
                <button class="mono-label dim" onclick="handleDeletePost('${p.id}')">Delete</button>
              </div>
            </div>
          `).join('') : '<p class="mono-label dim">No transmissions yet. Write your first one.</p>'}
        </div>
      </div>
    </section>
  `;
});


/* =============================================
   WRITE / EDIT POST
   ============================================= */
registerRoute('/write', async function(params, container) {
  const user = await getUser();
  if (!user) {
    navigateTo('/auth?mode=login');
    return;
  }

  let existingPost = null;
  if (params.edit) {
    try {
      const sb = getSupabase();
      const { data } = await sb.from('signal_posts').select('*').eq('id', params.edit).single();
      existingPost = data;
    } catch (e) { /* not found */ }
  }

  container.innerHTML = `
    <section class="page-header">
      <div class="page-header-inner">
        <span class="mono-label accent-text">◈ ${existingPost ? 'EDIT' : 'NEW'} TRANSMISSION</span>
        <h1 class="page-title">${existingPost ? 'Edit Post' : 'Write'}</h1>
      </div>
    </section>

    <section class="editor-section">
      <div class="dispatch-inner">
        <form class="editor-form" id="editorForm">
          <div class="form-field">
            <label class="form-label mono-label" for="postTitle">Title</label>
            <input type="text" id="postTitle" class="form-input form-input-large" placeholder="Transmission title..." value="${existingPost ? existingPost.title : ''}" required>
          </div>

          <div class="form-field">
            <label class="form-label mono-label" for="postExcerpt">Excerpt</label>
            <input type="text" id="postExcerpt" class="form-input" placeholder="Brief description for cards and SEO..." value="${existingPost ? existingPost.excerpt : ''}">
          </div>

          <div class="form-field">
            <label class="form-label mono-label" for="postTags">Tags <span class="dim">(comma separated)</span></label>
            <input type="text" id="postTags" class="form-input" placeholder="founder, systems, dispatch..." value="${existingPost ? (existingPost.tags || []).join(', ') : ''}">
          </div>

          <div class="form-field">
            <label class="form-label mono-label" for="postContent">Content <span class="dim">(Markdown supported)</span></label>
            <textarea id="postContent" class="form-textarea" rows="20" placeholder="Write your transmission...">${existingPost ? existingPost.content : ''}</textarea>
          </div>

          <div class="editor-actions">
            <button type="button" class="btn-secondary" onclick="handleSavePost('draft')">Save Draft</button>
            <button type="button" class="btn-primary" onclick="handleSavePost('published')">Publish →</button>
          </div>

          <div class="editor-status" id="editorStatus" style="display:none;"></div>
        </form>
      </div>
    </section>
  `;

  // Store edit ID for the save handler
  window._editPostId = existingPost ? existingPost.id : null;
});


/* =============================================
   GLOBAL HANDLERS
   ============================================= */

// Share handler
async function handleShare(postId, postSlug, platform) {
  try {
    const repost = await trackRepost(postId, platform);
    const shareUrl = getShareUrl(postSlug, repost.referral_code);

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Reading this transmission from The Signal 🏛️')}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=${encodeURIComponent('Check out this post on The Signal')}&body=${encodeURIComponent('I thought you might find this interesting: ' + shareUrl)}`;
        break;
      case 'copy_link':
        await navigator.clipboard.writeText(shareUrl);
        const btn = document.querySelector('[onclick*="copy_link"]');
        if (btn) {
          const span = btn.querySelector('span');
          span.textContent = 'Copied ✓';
          setTimeout(() => span.textContent = 'Copy Link', 2000);
        }
        break;
    }
  } catch (e) {
    console.error('Share error:', e);
  }
}

// Save post handler
async function handleSavePost(status) {
  const statusDiv = document.getElementById('editorStatus');
  const title = document.getElementById('postTitle').value.trim();
  const excerpt = document.getElementById('postExcerpt').value.trim();
  const content = document.getElementById('postContent').value.trim();
  const tags = document.getElementById('postTags').value.split(',').map(t => t.trim()).filter(Boolean);

  if (!title || !content) {
    statusDiv.style.display = 'block';
    statusDiv.className = 'editor-status error';
    statusDiv.textContent = 'Title and content are required.';
    return;
  }

  statusDiv.style.display = 'block';
  statusDiv.className = 'editor-status';
  statusDiv.textContent = 'Saving...';

  try {
    if (window._editPostId) {
      await updatePost(window._editPostId, { title, excerpt, content, tags, status });
    } else {
      await createPost({ title, excerpt, content, tags, status });
    }
    statusDiv.className = 'editor-status success';
    statusDiv.textContent = status === 'published' ? 'Published ✓' : 'Draft saved ✓';
    setTimeout(() => navigateTo('/dashboard'), 1500);
  } catch (e) {
    statusDiv.className = 'editor-status error';
    statusDiv.textContent = e.message || 'Failed to save';
  }
}

// Delete post handler
async function handleDeletePost(postId) {
  if (!confirm('Delete this transmission? This cannot be undone.')) return;
  try {
    await deletePost(postId);
    navigateTo('/dashboard');
  } catch (e) {
    alert('Failed to delete: ' + e.message);
  }
}

// Sign out handler
async function handleSignOut() {
  await signOut();
  navigateTo('/');
  updateAuthUI();
}

/* =============================================
   NEWSLETTER SECTION (reusable)
   ============================================= */
function renderNewsletterSection() {
  return `
    <section class="newsletter-cta">
      <div class="newsletter-inner">
        <div class="newsletter-content">
          <span class="mono-label accent-text">◈ RECEIVE THE SIGNAL</span>
          <h2 class="newsletter-heading">Weekly Transmission</h2>
          <p class="newsletter-desc">One founder. One frequency. No spam, no filler — just the raw field notes from building a cathedral in real time.</p>
        </div>
        <form class="newsletter-form" id="newsletterForm">
          <div class="input-group">
            <input type="email" placeholder="your@email.com" required aria-label="Email address" class="newsletter-input" id="nlEmail">
            <button type="submit" class="newsletter-btn">
              <span class="btn-text">Subscribe</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-arrow"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
          <span class="newsletter-note mono-label dim">Free · Unsubscribe anytime · Delivered Fridays</span>
        </form>
        <div class="newsletter-incentive">
          <span class="mono-label dim">Refer a friend → both earn <span class="gold-text">+10 reputation</span></span>
        </div>
      </div>
    </section>
  `;
}

function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('#nlEmail');
    const btn = form.querySelector('.newsletter-btn');
    const btnText = btn.querySelector('.btn-text');
    const email = input.value;
    if (!email) return;

    btnText.textContent = 'Sending...';
    btn.disabled = true;

    try {
      // Get referral code from URL if present
      const { params } = getRouteParams();
      await subscribeNewsletter(email, '', params.ref || '');
      btnText.textContent = 'Subscribed ✓';
      form.classList.add('submitted');
      input.value = '';
      input.placeholder = 'You are on the frequency.';
      input.disabled = true;
    } catch (err) {
      if (err.message === 'Already subscribed') {
        btnText.textContent = 'Already In ✓';
        input.placeholder = 'You are already on the frequency.';
        input.disabled = true;
      } else {
        btnText.textContent = 'Error — Retry';
        btn.disabled = false;
      }
    }
  });
}

/* =============================================
   META TAGS HELPER
   ============================================= */
function updateMetaTags(opts) {
  const setMeta = (attr, val, content) => {
    let el = document.querySelector(`meta[${attr}="${val}"]`);
    if (el) el.setAttribute('content', content);
  };
  if (opts.title) {
    setMeta('property', 'og:title', opts.title);
    setMeta('name', 'twitter:title', opts.title);
  }
  if (opts.description) {
    setMeta('name', 'description', opts.description);
    setMeta('property', 'og:description', opts.description);
    setMeta('name', 'twitter:description', opts.description);
  }
  if (opts.url) setMeta('property', 'og:url', opts.url);
  if (opts.image) setMeta('property', 'og:image', opts.image);
}

/* =============================================
   UTILITIES
   ============================================= */
function initScrollReveal() {
  const els = document.querySelectorAll('.dispatch, .quote-block, .entity-card, .status-bar, .newsletter-cta, .share-section, .author-card-section');
  els.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => observer.observe(el));
}

// Auth UI state
async function updateAuthUI() {
  const user = await getUser();
  const authLink = document.getElementById('authNavLink');
  if (authLink) {
    if (user) {
      authLink.href = '#/dashboard';
      authLink.textContent = 'Dashboard';
    } else {
      authLink.href = '#/auth';
      authLink.textContent = 'Sign In';
    }
  }
}
