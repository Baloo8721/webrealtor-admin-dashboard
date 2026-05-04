// Auth component - login, logout, checkAuth, setupRealtime
const SUPABASE_URL = 'https://dponfdhixuxriqqxbbri.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwb25mZGhpeHV4cmlxcXhiYnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NDk0NTYsImV4cCI6MjA3NzQyNTQ1Nn0.3l4yVUzenXVMrqWxFpXPq6IGpnBSlFK7rcXhkD-LRtw';
const RENDER_SERVER_URL = 'https://webrealtor-backend.onrender.com';

let supabaseClient;
let currentUser = null;

function initAuth() {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  checkAuth();
}

async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadDashboard();
    setupRealtime();
  }
}

window.login = async function() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) alert(error.message);
  else {
    currentUser = data.user;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadDashboard();
    setupRealtime();
  }
};

window.logout = async function() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
};

function setupRealtime() {
  supabaseClient.channel('dashboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => loadDashboard())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => loadDashboard())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => loadDashboard())
    .subscribe();
}

window.getSupabaseClient = function() { return supabaseClient; };
window.getCurrentUser = function() { return currentUser; };

// Initialize on load
document.addEventListener('DOMContentLoaded', initAuth);