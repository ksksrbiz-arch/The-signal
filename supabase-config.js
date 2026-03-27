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
}

async function signIn(email, password) {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const sb = getSupabase();
  const { error } = await sb.auth.signOut();
  if (error) throw error;
}

async function getSession() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  return session;
}

async function getUser() {
  const session = await getSession();
  if (!session) return null;
  return session.user;
}

async function getUserProfile(userId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('signal_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

/* =============================================
   POSTS API
   ============================================= */
async function fetchPublishedPosts(limit = 20, offset = 0) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('signal_posts')
    .select('id, slug, title, excerpt, cover_image_url, tags, view_count, repost_count, published_at, author_id, signal_profiles(display_name, avatar_url)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}

async function fetchPostBySlug(slug) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('signal_posts')
    .select('*, signal_profiles(display_name, avatar_url, bio)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  if (error) throw error;
  // Increment view count (fire and forget)
  sb.rpc('increment_view_count', { post_slug: slug }).catch(() => {});
  return data;
}

async function fetchMyPosts() {
  const user = await getUser();
  if (!user) return [];
  const sb = getSupabase();
  const { data, error } = await sb
    .from('signal_posts')
    .select('*')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function createPost(postData) {
  const user = await getUser();
  if (!user) throw new Error('Must be logged in to create posts');
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
}

async function updatePost(postId, postData) {
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
}

async function deletePost(postId) {
  const sb = getSupabase();
  const { error } = await sb
    .from('signal_posts')
    .delete()
    .eq('id', postId);
  if (error) throw error;
}

/* =============================================
   NEWSLETTER API
   ============================================= */
async function subscribeNewsletter(email, name, referrerCode) {
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
}

/* =============================================
   REPOST / SHARE API
   ============================================= */
async function trackRepost(postId, platform) {
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
