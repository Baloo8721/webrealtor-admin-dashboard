// Data component - loadDashboard, loadClients, loadAgents, loadReferrals, etc

async function loadDashboard() {
  await Promise.all([
    loadOverview(),
    loadStats(),
    loadClients(),
    loadReferrals(),
    loadAgents()
  ]);
}

async function loadOverview() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    const { data: todayClients } = await supabaseClient.from('clients').select('*').gte('created_at', today);
    const { data: referrals } = await supabaseClient.from('referrals').select('*');
    const { data: agents } = await supabaseClient.from('agents').select('*').eq('is_active', true);
    
    document.getElementById('todayLeads').textContent = todayClients?.length || 0;
    document.getElementById('totalClientsCount').textContent = todayClients?.length || 0;
    document.getElementById('activeReferralsCount').textContent = referrals?.filter(r => r.status === 'pending').length || 0;
    document.getElementById('totalAgentsCount').textContent = agents?.length || 0;
  } catch (e) { console.error('loadOverview error:', e); }
}

async function loadStats() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: clients } = await supabaseClient.from('clients').select('*');
    const { data: referrals } = await supabaseClient.from('referrals').select('*');
    const { data: agents } = await supabaseClient.from('agents').select('*');
    
    const today = new Date().toISOString().split('T')[0];
    const todayLeads = clients?.filter(c => c.created_at?.startsWith(today)).length || 0;
    document.getElementById('todayLeads').textContent = todayLeads;
    
    const activePipeline = referrals?.filter(r => r.status === 'pending' || r.status === 'accepted').length || 0;
    document.getElementById('activePipeline').textContent = activePipeline;
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const weekReferrals = referrals?.filter(r => r.created_at > weekAgo) || [];
    const accepted = weekReferrals.filter(r => r.status === 'accepted').length;
    const conversion = weekReferrals.length > 0 ? Math.round((accepted / weekReferrals.length) * 100) : 0;
    document.getElementById('overviewConversion').textContent = conversion + '%';
    
    document.getElementById('overviewMatchQuality').textContent = '85%';
    
    const totalAgents = agents?.length || 0;
    const activeAgents = agents?.filter(a => a.is_active).length || 0;
    document.getElementById('totalAgentsCount').textContent = totalAgents;
    document.getElementById('activeAgentsCount').textContent = activeAgents;
  } catch (e) { console.error('loadStats error:', e); }
}

async function loadClients() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: clients } = await supabaseClient.from('clients').select('*').order('created_at', { ascending: false });
    window.allClients = clients || [];
    
    const tbody = document.getElementById('clientsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = clients?.map(client => `
      <tr class="border-b border-slate-700">
        <td class="p-3">${client.name || '-'}</td>
        <td class="p-3">${client.email || '-'}</td>
        <td class="p-3">${client.phone || '-'}</td>
        <td class="p-3">${client.desired_city || '-'}</td>
        <td class="p-3"><span class="px-2 py-1 rounded text-xs ${client.status === 'matched' ? 'bg-green-600' : 'bg-yellow-600'}">${client.status || 'new'}</span></td>
        <td class="p-3">${new Date(client.created_at).toLocaleDateString()}</td>
        <td class="p-3"><button onclick="deleteClient('${client.id}')" class="text-red-400 hover:text-red-300">🗑️</button></td>
      </tr>
    `).join('') || '<tr><td colspan="7" class="p-3 text-slate-400">No clients found</td></tr>';
  } catch (e) { console.error('loadClients error:', e); }
}

async function loadReferrals() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: referrals } = await supabaseClient.from('referrals').select('*, clients(name, email), agents(name, email)').order('created_at', { ascending: false });
    window.allReferrals = referrals || [];
    
    const container = document.getElementById('referralsContainer');
    if (!container) return;
    
    container.innerHTML = referrals?.map(r => `
      <div class="bg-slate-800 p-4 rounded-lg mb-2">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-semibold text-white">Client: ${r.clients?.name || 'Unknown'}</p>
            <p class="text-sm text-slate-400">Agent: ${r.agents?.name || 'Unknown'}</p>
          </div>
          <span class="px-2 py-1 rounded text-xs ${r.status === 'accepted' ? 'bg-green-600' : r.status === 'declined' ? 'bg-red-600' : 'bg-yellow-600'}">${r.status || 'pending'}</span>
        </div>
        <div class="mt-2 flex gap-2">
          <button onclick="updateReferralStatus('${r.id}', 'accepted')" class="px-2 py-1 bg-green-600 rounded text-xs">Accept</button>
          <button onclick="updateReferralStatus('${r.id}', 'declined')" class="px-2 py-1 bg-red-600 rounded text-xs">Decline</button>
        </div>
      </div>
    `).join('') || '<p class="text-slate-400">No referrals found</p>';
  } catch (e) { console.error('loadReferrals error:', e); }
}

async function loadAgents() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: agents } = await supabaseClient.from('agents').select('*, referrals(count)').order('created_at', { ascending: false });
    
    const totalAgents = agents?.length || 0;
    const activeAgents = agents?.filter(a => a.is_active).length || 0;
    
    document.getElementById('totalAgentsCount').textContent = totalAgents;
    document.getElementById('activeAgentsCount').textContent = activeAgents;
    
    const cityCounts = {};
    agents?.forEach(agent => { (agent.service_cities || []).forEach(city => { cityCounts[city] = (cityCounts[city] || 0) + 1; }); });
    const topCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const cityDiv = document.getElementById('topServiceCities');
    if (cityDiv) cityDiv.innerHTML = topCities.map(([city, count]) => `<div class="flex justify-between"><span>${city}</span><span class="text-cyan-400">${count}</span></div>`).join('') || '<p class="text-slate-400">No data</p>';
    
    const agentContainer = document.getElementById('agentsListContainer');
    if (!agentContainer) return;
    
    agentContainer.innerHTML = agents?.map(agent => `
      <div class="bg-slate-800 p-4 rounded-lg mb-2 border border-slate-700">
        <div class="flex justify-between items-start">
          <div>
            <p class="font-bold text-white">${agent.name}</p>
            <p class="text-sm text-slate-400">${agent.email || 'No email'}</p>
            <p class="text-xs text-slate-500">${agent.phone || 'No phone'}</p>
            <p class="text-xs text-slate-500">${agent.brokerage || 'No brokerage'}</p>
          </div>
          <div class="text-right">
            <span class="px-2 py-1 rounded text-xs ${agent.is_active ? 'bg-green-600' : 'bg-red-600'}">${agent.is_active ? 'Active' : 'Inactive'}</span>
            <p class="text-xs text-slate-400 mt-1">${agent.referrals?.length || 0} referrals</p>
          </div>
        </div>
        <p class="text-xs text-cyan-400 mt-2">Service: ${(agent.service_cities || []).join(', ')}</p>
        <p class="text-xs text-purple-400">Specialties: ${(agent.specialties || []).join(', ')}</p>
        <div class="mt-3 flex gap-2">
          <button onclick="toggleAgentActive('${agent.id}', ${!agent.is_active})" class="px-2 py-1 bg-slate-600 rounded text-xs">${agent.is_active ? 'Deactivate' : 'Activate'}</button>
          <button onclick="deleteAgent('${agent.id}')" class="px-2 py-1 bg-red-600 rounded text-xs">Delete</button>
        </div>
      </div>
    `).join('') || '<p class="text-slate-400">No agents found</p>';
  } catch (e) { console.error('loadAgents error:', e); }
}