/* THE SIGNAL — Supabase Configuration */
const SUPABASE_URL = 'https://deqyxiwtjkmbgxnsdakj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcXl4aXd0amttYmd4bnNkYWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIzMTAsImV4cCI6MjA4ODE1ODMxMH0.TLf6WQup-aoLICksWNoK1PDtL0fWYAoUztH6BSSUpRQ';

// Initialize Supabase client (loaded via CDN in HTML)
let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

/* =============================================
   AUTH HELPERS
   ============================================= */
async function signUp(email, password, displayName) {
  const sb = getSupabase();
  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin + '/#/auth/callback'
      }
    });
    if (error) throw error;
    return data;
  } catch (e) {
    throw new Error(e.message || 'Sign-up failed. Please try again.');
  }
}

async function signIn(email, password) {
  const sb = getSupabase();
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  } catch (e) {
    throw new Error(e.message || 'Sign-in failed. Check your credentials and try again.');
  }
}

async function signOut() {
  const sb = getSupabase();
  try {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  } catch (e) {
    console.error('Sign-out error:', e);
    throw new Error('Sign-out failed. Please try again.');
  }
}

async function getSession() {
  try {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    return session;
  } catch (e) {
    console.error('Session error:', e);
    return null;
  }
}

async function getUser() {
  const session = await getSession();
  if (!session) return null;
  return session.user;
}

async function getUserProfile(userId) {
  const sb = getSupabase();
  try {
    const { data, error } = await sb
      .from('signal_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  } catch (e) {
    console.error('Profile fetch error:', e);
    return null;
  }
}

/* =============================================
   POSTS API
   ============================================= */
async function fetchPublishedPosts(limit = 20, offset = 0) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('signal_posts')
      .select('id, slug, title, excerpt, cover_image_url, tags, view_count, repost_count, published_at, author_id')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    // Fetch author profiles separately
    const posts = data || [];
    const authorIds = [...new Set(posts.map(p => p.author_id))];
    if (authorIds.length > 0) {
      const { data: profiles, error: profileError } = await sb
        .from('signal_profiles')
        .select('id, display_name, avatar_url')
        .in('id', authorIds);
      if (profileError) console.error('Failed to load author profiles:', profileError);
      const profileMap = {};
      (profiles || []).forEach(p => profileMap[p.id] = p);
      posts.forEach(p => p.signal_profiles = profileMap[p.author_id] || { display_name: 'Unknown', avatar_url: '' });
    }
    return posts;
  } catch (e) {
    console.error('Failed to fetch posts:', e);
    throw new Error('Unable to load posts. Please try again later.');
  }
}

async function fetchPostBySlug(slug) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('signal_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    if (error) throw error;
    // Fetch author profile separately
    if (data && data.author_id) {
      const { data: profile, error: profileError } = await sb
        .from('signal_profiles')
        .select('display_name, avatar_url, bio')
        .eq('id', data.author_id)
        .single();
      if (profileError) console.error('Failed to load author profile:', profileError);
      data.signal_profiles = profile || { display_name: 'Unknown', avatar_url: '', bio: '' };
    }
    // Increment view count (fire and forget)
    sb.rpc('increment_view_count', { post_slug: slug }).catch(e =>
      console.error('View count increment failed:', e)
    );
    return data;
  } catch (e) {
    console.error('Failed to fetch post:', e);
    throw new Error('Unable to load this post. It may not exist or the connection failed.');
  }
}

async function fetchMyPosts() {
  const user = await getUser();
  if (!user) return [];
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('signal_posts')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Failed to fetch your posts:', e);
    throw new Error('Unable to load your posts. Please try again later.');
  }
}

async function createPost(postData) {
  const user = await getUser();
  if (!user) throw new Error('Must be logged in to create posts');
  try {
    const sb = getSupabase();
    const slug = postData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);
    const { data, error } = await sb
      .from('signal_posts')
      .insert({
        author_id: user.id,
        slug,
        title: postData.title,
        excerpt: postData.excerpt || '',
        content: postData.content,
        tags: postData.tags || [],
        status: postData.status || 'draft',
        published_at: postData.status === 'published' ? new Date().toISOString() : null
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Failed to create post:', e);
    throw new Error('Unable to save post. Please try again.');
  }
}

async function updatePost(postId, postData) {
  try {
    const sb = getSupabase();
    const updates = { ...postData };
    if (postData.status === 'published' && !postData.published_at) {
      updates.published_at = new Date().toISOString();
    }
    const { data, error } = await sb
      .from('signal_posts')
      .update(updates)
      .eq('id', postId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Failed to update post:', e);
    throw new Error('Unable to update post. Please try again.');
  }
}

async function deletePost(postId) {
  try {
    const sb = getSupabase();
    const { error } = await sb
      .from('signal_posts')
      .delete()
      .eq('id', postId);
    if (error) throw error;
  } catch (e) {
    console.error('Failed to delete post:', e);
    throw new Error('Unable to delete post. Please try again.');
  }
}

/* =============================================
   NEWSLETTER API
   ============================================= */
async function subscribeNewsletter(email, name, referrerCode) {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('signal_subscribers')
      .insert({
        email,
        name: name || '',
        source: 'website',
        referrer_code: referrerCode || ''
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('Already subscribed');
      throw error;
    }
    return data;
  } catch (e) {
    if (e.message === 'Already subscribed') throw e;
    console.error('Newsletter subscription error:', e);
    throw new Error('Subscription failed. Please try again later.');
  }
}

/* =============================================
   REPOST / SHARE API
   ============================================= */
async function trackRepost(postId, platform) {
  try {
    const user = await getUser();
    const referralCode = generateReferralCode();
    const sb = getSupabase();
    const { data, error } = await sb
      .from('signal_reposts')
      .insert({
        post_id: postId,
        user_id: user ? user.id : null,
        platform,
        referral_code: referralCode
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Repost tracking error:', e);
    throw new Error('Unable to track share. The link will still work.');
  }
}

function generateReferralCode() {
  return 'sig_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getShareUrl(postSlug, referralCode) {
  return `${window.location.origin}/#/post/${postSlug}?ref=${referralCode}`;
}

/* =============================================
   MARKDOWN RENDERER (simple)
   ============================================= */
function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^>\s*(.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  // Wrap loose <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs: wrap lines that aren't already in a block element
  html = html.split('\n\n').map(block => {
    block = block.trim();
    if (!block) return '';
    if (/^<(h[1-6]|ul|ol|blockquote|pre|hr|div|section)/.test(block)) return block;
    if (block.startsWith('<li>')) return block;
    return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
  }).join('\n');

  return html;
}
