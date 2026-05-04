// Auth component - login, logout, checkAuth, setupRealtime

let currentUser = null;

async function checkAuth() {
  const supabaseClient = window.getSupabaseClient();
  if (!supabaseClient) return;
  
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
  const supabaseClient = window.getSupabaseClient();
  if (!supabaseClient) {
    alert('System not ready, please refresh');
    return;
  }
  
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
  const supabaseClient = window.getSupabaseClient();
  if (!supabaseClient) return;
  
  await supabaseClient.auth.signOut();
  currentUser = null;
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
};

function setupRealtime() {
  const supabaseClient = window.getSupabaseClient();
  if (!supabaseClient) return;
  
  supabaseClient.channel('dashboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => loadDashboard())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => loadDashboard())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, () => loadDashboard())
    .subscribe();
}

window.getCurrentUser = function() { return currentUser; };

// Expose checkAuth for index.html to call
window.initAuth = checkAuth;