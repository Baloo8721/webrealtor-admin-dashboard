// Actions component - deleteAgent, toggleAgentActive, updateReferralStatus, etc

window.deleteAgent = async function(agentId) {
  if (!confirm('Delete this agent?')) return;
  try {
    const supabaseClient = window.getSupabaseClient();
    await supabaseClient.from('agents').delete().eq('id', agentId);
    loadAgents();
  } catch (e) { alert('Error: ' + e.message); }
};

window.toggleAgentActive = async function(agentId, isActive) {
  try {
    const supabaseClient = window.getSupabaseClient();
    await supabaseClient.from('agents').update({ is_active: isActive }).eq('id', agentId);
    loadAgents();
  } catch (e) { alert('Error: ' + e.message); }
};

window.deleteClient = async function(clientId) {
  if (!confirm('Delete this client?')) return;
  try {
    const supabaseClient = window.getSupabaseClient();
    await supabaseClient.from('clients').delete().eq('id', clientId);
    loadClients();
  } catch (e) { alert('Error: ' + e.message); }
};

async function updateReferralStatus(referralId, status) {
  try {
    const supabaseClient = window.getSupabaseClient();
    await supabaseClient.from('referrals').update({ status }).eq('id', referralId);
    loadReferrals();
  } catch (e) { alert('Error: ' + e.message); }
}

async function triggerScraper() {
  const city = document.getElementById('scrapeCity')?.value || 'Miami';
  const state = document.getElementById('scrapeState')?.value || 'FL';
  
  try {
    const response = await fetch('https://webrealtor-backend.onrender.com/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city, state })
    });
    const result = await response.json();
    document.getElementById('scraperStatus').innerHTML = `<p class="text-green-500">Found ${result.count || 0} agents</p>`;
    loadAgents();
  } catch (e) { document.getElementById('scraperStatus').innerHTML = `<p class="text-red-500">Error: ${e.message}</p>`; }
}

function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.getElementById(tabName + 'Tab').classList.remove('hidden');
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('bg-cyan-500');
    b.classList.add('bg-slate-700');
  });
  event.target.classList.remove('bg-slate-700');
  event.target.classList.add('bg-cyan-500');
  
  if (tabName === 'overview') loadDashboard();
  if (tabName === 'clients') loadClients();
  if (tabName === 'referrals') loadReferrals();
  if (tabName === 'agents') loadAgents();
  if (tabName === 'analytics') loadAnalytics();
}