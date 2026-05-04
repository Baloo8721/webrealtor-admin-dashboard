// Analytics component - charts and analytics functions

async function loadAnalytics() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: clients } = await supabaseClient.from('clients').select('*');
    const { data: referrals } = await supabaseClient.from('referrals').select('*');
    const { data: agents } = await supabaseClient.from('agents').select('*');
    
    document.getElementById('analyticsTotalClients').textContent = clients?.length || 0;
    document.getElementById('analyticsActiveReferrals').textContent = referrals?.filter(r => r.status === 'pending').length || 0;
    document.getElementById('analyticsTotalAgents').textContent = agents?.length || 0;
    document.getElementById('analyticsConversion').textContent = '24%';
  } catch (e) { console.error('loadAnalytics error:', e); }
}

async function loadLiveMatchScores() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: referrals } = await supabaseClient.from('referrals').select('*, clients(name), agents(name, match_score)').order('created_at', { ascending: false }).limit(20);
    
    const container = document.getElementById('liveMatchScoresContainer');
    if (!container) return;
    
    container.innerHTML = referrals?.map(r => `
      <div class="bg-slate-800 p-3 rounded mb-2 flex justify-between">
        <span class="text-white">${r.clients?.name || 'Unknown'}</span>
        <span class="text-cyan-400">${Math.round((r.agents?.match_score || 0.8) * 100)}%</span>
      </div>
    `).join('') || '<p class="text-slate-400">No data</p>';
  } catch (e) { console.error('loadLiveMatchScores error:', e); }
}

async function loadMatchQualityAnalytics() {
  try {
    const container = document.getElementById('matchQualityContainer');
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400">Match quality analytics coming soon...</p>';
  } catch (e) { console.error('loadMatchQualityAnalytics error:', e); }
}

async function loadSpecialtyMatches() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: agents } = await supabaseClient.from('agents').select('specialties');
    
    const specialtyCounts = {};
    agents?.forEach(agent => { (agent.specialties || []).forEach(s => { specialtyCounts[s] = (specialtyCounts[s] || 0) + 1; }); });
    
    const container = document.getElementById('specialtyMatchesContainer');
    if (!container) return;
    
    container.innerHTML = Object.entries(specialtyCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([spec, count]) => `
      <div class="bg-slate-800 p-3 rounded mb-2 flex justify-between">
        <span class="text-white">${spec}</span>
        <span class="text-purple-400">${count}</span>
      </div>
    `).join('') || '<p class="text-slate-400">No data</p>';
  } catch (e) { console.error('loadSpecialtyMatches error:', e); }
}

async function loadSpecialtyAnalytics() {
  try {
    const container = document.getElementById('specialtyAnalyticsContainer');
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400">Specialty analytics coming soon...</p>';
  } catch (e) { console.error('loadSpecialtyAnalytics error:', e); }
}