// Data component - loadDashboard, loadOverview, loadStats, loadClients, loadReferrals, loadAgents, displayReferrals, displayAgents

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
    
    const activePipeline = referrals?.filter(r => r.status === 'pending' || r.status === 'matched').length || 0;
    document.getElementById('activePipeline').textContent = activePipeline;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekReferrals = referrals?.filter(r => new Date(r.created_at) > weekAgo) || [];
    const weekCompleted = weekReferrals.filter(r => r.status === 'completed').length;
    const conversionRate = weekReferrals.length > 0 ? (weekCompleted / weekReferrals.length * 100).toFixed(1) : 0;
    document.getElementById('overviewConversion').textContent = conversionRate + '%';
    
    const validScores = referrals?.filter(r => r.match_score !== null) || [];
    const avgQuality = validScores.length > 0 
      ? (validScores.reduce((sum, r) => sum + r.match_score, 0) / validScores.length * 100).toFixed(1)
      : 0;
    document.getElementById('overviewMatchQuality').textContent = avgQuality + '%';
    
    const recentActivity = [];
    
    todayClients?.slice(0, 3).forEach(client => {
      recentActivity.push({
        type: 'client',
        title: `New lead: ${client.name}`,
        description: `Budget: $${client.budget_amount?.toLocaleString() || 'Not specified'}`,
        time: new Date(client.created_at).toLocaleTimeString(),
        icon: '👥',
        color: 'text-cyan-400'
      });
    });
    
    referrals?.slice(0, 3).forEach(referral => {
      recentActivity.push({
        type: 'referral',
        title: `${referral.clients?.name} → ${referral.agents?.name}`,
        description: `Match: ${referral.match_score ? (referral.match_score * 100).toFixed(1) + '%' : 'N/A'}`,
        time: new Date(referral.created_at).toLocaleTimeString(),
        icon: '🎯',
        color: 'text-yellow-400'
      });
    });
    
    recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    const activityHtml = recentActivity.slice(0, 6).map(activity => `
      <div class="flex items-start gap-3 p-3 bg-slate-700 rounded">
        <span class="text-xl">${activity.icon}</span>
        <div class="flex-1">
          <p class="text-sm font-semibold text-white">${activity.title}</p>
          <p class="text-xs text-slate-400">${activity.description}</p>
          <p class="text-xs ${activity.color} mt-1">${activity.time}</p>
        </div>
      </div>
    `).join('');
    
    document.getElementById('recentActivity').innerHTML = activityHtml || '<p class="text-slate-400">No recent activity</p>';
  } catch (error) {
    console.error('Error loading overview:', error);
  }
}

async function loadStats() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { count: clientsCount } = await supabaseClient.from('clients').select('*', { count: 'exact', head: true });
    const { count: referralsCount } = await supabaseClient.from('referrals').select('*', { count: 'exact', head: true });
    const { count: agentsCount } = await supabaseClient.from('agents').select('*', { count: 'exact', head: true }).eq('is_active', true);
    
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabaseClient.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', today);
    
    let avgMatchScore = 0;
    try {
      const { data: referrals } = await supabaseClient.from('referrals').select('match_score').not('match_score', 'is', null);
      if (referrals && referrals.length > 0) {
        avgMatchScore = referrals.reduce((sum, r) => sum + r.match_score, 0) / referrals.length;
      }
    } catch (e) {
      // match_score column might not exist yet
    }

    document.getElementById('totalClients').textContent = clientsCount || 0;
    document.getElementById('activeReferrals').textContent = referralsCount || 0;
    document.getElementById('totalAgents').textContent = agentsCount || 0;
    document.getElementById('emailsSent').textContent = todayCount || 0;
    
    if (avgMatchScore > 0) {
      const emailsElement = document.getElementById('emailsSent');
      emailsElement.innerHTML = `${todayCount || 0}<div class="text-xs text-slate-400">Avg Match: ${(avgMatchScore * 100).toFixed(1)}%</div>`;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    document.getElementById('totalClients').textContent = '0';
    document.getElementById('activeReferrals').textContent = '0';
    document.getElementById('totalAgents').textContent = '0';
    document.getElementById('emailsSent').textContent = '0';
  }
}

async function loadClients() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: clients, error } = await supabaseClient.from('clients').select('*').order('created_at', { ascending: false }).limit(20);
    
    if (error) {
      console.error('Error loading clients:', error);
      document.getElementById('clientsList').innerHTML = '<p class="text-red-400">Error loading clients</p>';
      return;
    }
    
    if (!clients) {
      document.getElementById('clientsList').innerHTML = '<p class="text-slate-400">No clients yet</p>';
      return;
    }
    
    const statusColors = {
      'pending_matching': 'text-purple-400 bg-purple-900',
      'matched': 'text-green-400 bg-green-900',
      'pending': 'text-yellow-400 bg-yellow-900'
    };
    
    const html = clients.map(c => {
      const specialties = c.agent_specialties || [];
      const specialtyText = specialties.length > 0 ? specialties.slice(0, 3).join(', ') + (specialties.length > 3 ? '...' : '') : 'None specified';
      const language = c.preferred_language || 'English';
      const languageFlag = {
        'en': '🇺🇸', 'es': '🇪🇸', 'zh': '🇨🇳', 'ar': '🇸🇦', 'ru': '🇷🇺', 'pt': '🇵🇹', 'fr': '🇫🇷', 'it': '🇮🇹', 'de': '🇩🇪', 'ja': '🇯🇵', 'sv': '🇸🇪', 'ko': '🇰🇷'
      }[language] || '🌐';
      const statusClass = statusColors[c.status] || 'text-slate-400 bg-slate-700';
      const statusLabel = {
        'pending_matching': '🔄 Being Matched',
        'matched': '✅ Matched',
        'pending': '⏳ Pending'
      }[c.status] || '📋 New';
      
      return `
        <div class="p-4 bg-slate-800 rounded border border-slate-700 hover:border-cyan-500 transition-colors">
          <div class="flex justify-between items-start mb-2">
            <div>
              <p class="font-bold text-white">${c.name}</p>
              <p class="text-sm text-cyan-400">${c.email}</p>
              ${c.phone ? `<p class="text-sm text-slate-400">${c.phone}</p>` : ''}
            </div>
            <div class="text-right">
              <span class="text-2xl">${languageFlag}</span>
              <p class="text-xs text-slate-400">${language}</p>
              <span class="text-xs px-2 py-1 rounded ${statusClass}">${statusLabel}</span>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-sm mb-2">
            <div>
              <span class="text-slate-400">From:</span>
              <span class="text-white ml-1">${c.current_city || 'Not specified'}</span>
            </div>
            <div>
              <span class="text-slate-400">To:</span>
              <span class="text-cyan-400 ml-1 font-semibold">${c.desired_city || 'Not specified'}</span>
            </div>
          </div>
          
          <div class="mb-2">
            <span class="text-slate-400 text-sm">Specialties: </span>
            <span class="text-white text-sm">${specialtyText}</span>
          </div>
          
          ${c.agents ? `
            <div class="mb-2 text-sm">
              <span class="text-slate-400">Matched Agent: </span>
              <span class="text-green-400">${c.agents.name}</span>
            </div>
          ` : ''}
          
          ${c.budget_amount ? `
            <div class="mb-2">
              <span class="text-slate-400 text-sm">Budget: </span>
              <span class="text-green-400 text-sm font-semibold">$${c.budget_amount.toLocaleString()}</span>
            </div>
          ` : ''}
          
          <div class="flex justify-between items-center text-xs text-slate-400">
            <span>Source: ${c.source_website || 'Direct'}</span>
            <div class="flex gap-2">
              ${c.status === 'pending_matching' ? `<button onclick="triggerMatchingForClient('${c.id}')" class="px-2 py-1 bg-purple-500 rounded text-xs hover:bg-purple-600">⚡ Match</button>` : ''}
              <button onclick="deleteClient('${c.id}')" class="px-2 py-1 bg-red-700 rounded text-xs hover:bg-red-800">Delete</button>
              <span>${new Date(c.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    document.getElementById('clientsList').innerHTML = html || '<p class="text-slate-400">No clients found</p>';
  } catch (error) {
    console.error('Error loading clients:', error);
    document.getElementById('clientsList').innerHTML = '<p class="text-red-400">Error loading clients</p>';
  }
}

async function loadReferrals() {
  try {
    console.log('Loading referrals...');
    
    const { data: rawReferrals, error: rawError } = await supabaseClient
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('Raw referrals:', rawReferrals, 'error:', rawError);
    
    if (rawError) {
      console.error('Error loading referrals:', rawError);
      document.getElementById('referralsList').innerHTML = '<p class="text-red-400">Error: ' + rawError.message + '</p>';
      return;
    }
    
    if (!rawReferrals || rawReferrals.length === 0) {
      document.getElementById('referralsList').innerHTML = '<p class="text-slate-400">No referrals yet - when a client submits and matches with an agent, it will appear here.</p>';
      document.getElementById('pipelineTotal').textContent = '0';
      document.getElementById('pipelinePending').textContent = '0';
      document.getElementById('pipelineMatched').textContent = '0';
      document.getElementById('pipelineCompleted').textContent = '0';
      return;
    }
    
    const supabaseClient = window.getSupabaseClient();
    const referrals = [];
    for (const r of rawReferrals) {
      const { data: client } = await supabaseClient.from('clients').select('name, email, preferred_language, current_city, desired_city').eq('id', r.client_id).single();
      const { data: agent } = await supabaseClient.from('agents').select('name, email, specialties').eq('id', r.agent_id).single();
      referrals.push({ ...r, clients: client, agents: agent });
    }
    
    console.log('Processed referrals:', referrals);
    
    const totalReferrals = referrals.length;
    const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
    const matchedReferrals = referrals.filter(r => r.status === 'matched' || r.status === 'accepted').length;
    const completedReferrals = referrals.filter(r => r.status === 'completed').length;
    
    document.getElementById('pipelineTotal').textContent = totalReferrals;
    document.getElementById('pipelinePending').textContent = pendingReferrals;
    document.getElementById('pipelineMatched').textContent = matchedReferrals;
    document.getElementById('pipelineCompleted').textContent = completedReferrals;
    
    const funnelStages = [
      { name: 'Pending', count: pendingReferrals, color: 'from-yellow-500 to-yellow-600' },
      { name: 'Matched', count: matchedReferrals, color: 'from-blue-500 to-blue-600' },
      { name: 'Completed', count: completedReferrals, color: 'from-green-500 to-green-600' }
    ];
    
    const funnelHtml = funnelStages.map((stage, index) => {
      const percentage = totalReferrals > 0 ? (stage.count / totalReferrals * 100).toFixed(1) : 0;
      const width = Math.max(percentage, 5);
      return `
        <div class="flex items-center gap-3">
          <div class="w-20 text-right">
            <span class="text-sm font-semibold text-white">${stage.name}</span>
            <div class="text-xs text-slate-400">${stage.count} (${percentage}%)</div>
          </div>
          <div class="flex-1">
            <div class="h-8 bg-gradient-to-r ${stage.color} rounded flex items-center justify-center" style="width: ${width}%">
              <span class="text-xs font-bold text-white">${stage.count}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    document.getElementById('referralFunnel').innerHTML = funnelHtml;
    
    window.allReferrals = referrals;
    displayReferrals(referrals);
  } catch (error) {
    console.error('Error loading referrals:', error);
    document.getElementById('referralsList').innerHTML = '<p class="text-red-400">Error loading referrals</p>';
  }
}

function displayReferrals(referrals) {
  const html = referrals.map(r => {
    const matchScore = r.match_score ? (r.match_score * 100).toFixed(1) : 'N/A';
    const statusColor = {
      'pending': 'text-yellow-400',
      'accepted': 'text-green-400', 
      'declined': 'text-red-400',
      'pending_matching': 'text-purple-400'
    }[r.status] || 'text-slate-400';
    
    const statusIcon = {
      'pending': '⏳ Waiting for agent',
      'accepted': '✅ Agent accepted', 
      'declined': '❌ Agent declined',
      'pending_matching': '🔄 Being matched'
    }[r.status] || '📋';
    
    return `
      <div class="p-4 bg-slate-800 rounded border border-slate-700 hover:border-cyan-500 transition-colors">
        <div class="flex justify-between items-start mb-3">
          <div class="flex items-center gap-3">
            <span class="text-2xl">${statusIcon}</span>
            <div>
              <p class="font-bold text-white">${r.clients?.name || 'Unknown'} → ${r.agents?.name || 'Unassigned'}</p>
              <p class="text-sm text-cyan-400">${r.clients?.email}</p>
              ${r.agents?.email ? `<p class="text-sm text-slate-400">Agent: ${r.agents.email}</p>` : ''}
            </div>
          </div>
          <div class="text-right">
            <span class="text-lg font-bold ${matchScore !== 'N/A' ? 'text-cyan-400' : 'text-slate-400'}">${matchScore}%</span>
            <p class="text-xs ${statusColor}">${r.status || 'pending'}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <span class="text-slate-400">From:</span>
            <span class="text-white ml-1">${r.clients?.current_city || 'Not specified'}</span>
          </div>
          <div>
            <span class="text-slate-400">To:</span>
            <span class="text-cyan-400 ml-1">${r.clients?.desired_city || 'Not specified'}</span>
          </div>
        </div>
        
        ${r.specialty_match !== undefined ? `
          <div class="flex gap-4 text-xs mb-3 p-2 bg-slate-700 rounded">
            <span class="${r.specialty_match ? 'text-green-400' : 'text-red-400'}">
              🎯 Specialty: ${r.specialty_match ? '✓' : '✗'}
            </span>
            <span class="${r.language_match ? 'text-green-400' : 'text-red-400'}">
              🌐 Language: ${r.language_match ? '✓' : '✗'}
            </span>
            <span class="${r.location_match ? 'text-green-400' : 'text-red-400'}">
              📍 Location: ${r.location_match ? '✓' : '✗'}
            </span>
          </div>
        ` : ''}
        
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-400">${new Date(r.created_at).toLocaleDateString()} ${r.referral_order ? '| Attempt #' + r.referral_order : ''}</span>
          <div class="flex gap-2">
            ${r.status === 'pending' ? `<button onclick="updateReferralStatus('${r.id}', 'accepted')" class="px-2 py-1 bg-green-500 rounded text-xs hover:bg-green-600">Accept</button>` : ''}
            ${r.status === 'pending' ? `<button onclick="updateReferralStatus('${r.id}', 'declined')" class="px-2 py-1 bg-red-500 rounded text-xs hover:bg-red-600">Decline</button>` : ''}
            ${r.status === 'declined' ? `<button onclick="triggerMatchingForClient('${r.client_id}')" class="px-2 py-1 bg-purple-500 rounded text-xs hover:bg-purple-600">Retry Match</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('referralsList').innerHTML = html || '<p class="text-slate-400">No referrals found</p>';
}

async function loadAgents() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: agents, error } = await supabaseClient
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('Loading agents:', agents, 'error:', error);
    
    if (error) {
      console.error('Error loading agents:', error);
      document.getElementById('agentsList').innerHTML = '<p class="text-red-400">Error loading agents: ' + error.message + '</p>';
      return;
    }
    
    if (!agents || agents.length === 0) {
      document.getElementById('agentsList').innerHTML = '<p class="text-slate-400">No agents yet. Add agents manually or they will be added automatically when clients submit forms.</p>';
      return;
    }
    
    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.is_active === true || a.is_active === null || a.is_active === undefined).length;
    
    if (document.getElementById('totalAgentsCount')) {
      document.getElementById('totalAgentsCount').textContent = totalAgents;
    }
    if (document.getElementById('activeAgentsCount')) {
      document.getElementById('activeAgentsCount').textContent = activeAgents;
    }
    
    document.getElementById('totalAgentsCount').textContent = totalAgents;
    document.getElementById('activeAgentsCount').textContent = activeAgents;
    document.getElementById('avgAgentPerformance').textContent = '0%';
    document.getElementById('topPerformersCount').textContent = '0';
    
    const cityCounts = {};
    agents.forEach(agent => {
      if (agent.service_cities) {
        agent.service_cities.forEach(city => {
          cityCounts[city] = (cityCounts[city] || 0) + 1;
        });
      }
    });
    
    const cityHtml = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([city, count]) => {
        const percentage = (count / agents.length * 100).toFixed(1);
        return `
          <div class="flex justify-between items-center">
            <span class="text-sm text-white">${city}</span>
            <div class="flex items-center gap-2">
              <div class="w-20 bg-slate-700 rounded-full h-2">
                <div class="bg-cyan-500 h-2 rounded-full" style="width: ${percentage}%"></div>
              </div>
              <span class="text-sm font-bold text-cyan-400">${count} agents</span>
            </div>
          </div>
        `;
      }).join('');
    document.getElementById('topServiceCities').innerHTML = cityHtml || '<p class="text-slate-400">No city data</p>';
    
    const specialtyCounts = {};
    agents.forEach(agent => {
      if (agent.specialties) {
        agent.specialties.forEach(specialty => {
          specialtyCounts[specialty] = (specialtyCounts[specialty] || 0) + 1;
        });
      }
    });
    
    const specialtyHtml = Object.entries(specialtyCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([specialty, count]) => {
        const percentage = (count / agents.length * 100).toFixed(1);
        return `
          <div class="flex justify-between items-center">
            <span class="text-sm text-white">${specialty}</span>
            <span class="text-sm font-bold text-purple-400">${count} (${percentage}%)</span>
          </div>
        `;
      }).join('');
    document.getElementById('agentSpecialtyDistribution').innerHTML = specialtyHtml || '<p class="text-slate-400">No specialty data</p>';
    
    window.allAgents = agents;
    displayAgents(agents);
  } catch (error) {
    console.error('Error loading agents:', error);
    document.getElementById('agentsList').innerHTML = '<p class="text-red-400">Error loading agents</p>';
  }
}

function displayAgents(agents) {
  console.log('Displaying agents:', agents);
  
  if (!agents || agents.length === 0) {
    document.getElementById('agentsList').innerHTML = '<p class="text-slate-400">No agents found</p>';
    return;
  }
  
  const html = agents.map(a => {
    const specialties = a.specialties || [];
    const languages = a.languages || [];
    const cities = a.service_cities || [];
    const isActive = a.is_active === true || a.is_active === null || a.is_active === undefined;
    
    const performanceTier = '-';
    const tierColor = 'text-slate-400';
    
    return `
      <div class="p-4 bg-slate-800 rounded border border-slate-700 hover:border-cyan-500 transition-colors">
        <div class="flex justify-between items-start mb-3">
          <div>
            <p class="font-bold text-white">${a.name || 'Unknown'}</p>
            <p class="text-sm text-cyan-400">${a.email || 'No email'}</p>
            ${a.brokerage ? `<p class="text-sm text-slate-400">${a.brokerage}</p>` : ''}
          </div>
          <div class="text-right">
            <span class="text-lg font-bold ${tierColor}">${performanceTier}</span>
            <p class="text-xs text-slate-400">0 referrals</p>
          </div>
        </div>
        
        <div class="mb-3">
          <span class="text-slate-400 text-sm">Service Area:</span>
          <span class="text-white text-sm ml-1">${cities.slice(0, 3).join(', ') || 'None specified'}${cities.length > 3 ? '...' : ''}</span>
        </div>
        
        ${specialties.length > 0 ? `
          <div class="mb-3">
            <span class="text-slate-400 text-sm">Specialties:</span>
            <span class="text-white text-sm ml-1">${specialties.slice(0, 3).join(', ')}${specialties.length > 3 ? '...' : ''}</span>
          </div>
        ` : ''}
        
        ${languages.length > 0 ? `
          <div class="mb-3">
            <span class="text-slate-400 text-sm">Languages:</span>
            <span class="text-white text-sm ml-1">${languages.join(', ')}</span>
          </div>
        ` : ''}
        
        <div class="flex justify-between items-center">
          <span class="text-xs px-2 py-1 rounded ${isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">
            ${isActive ? 'Active' : 'Inactive'}
          </span>
          <div class="flex gap-2">
            <button onclick="toggleAgentActive('${a.id}', ${!isActive})" class="px-3 py-1 ${isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} rounded text-xs transition-colors">
              ${isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button onclick="deleteAgent('${a.id}')" class="px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-xs transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('agentsList').innerHTML = html;
}

window.filterReferrals = function(status) {
  const referrals = window.allReferrals || [];
  const filtered = status === 'all' ? referrals : referrals.filter(r => r.status === status);
  displayReferrals(filtered);
};

window.filterAgents = function(filter) {
  const agents = window.allAgents || [];
  let filtered = agents;
  
  switch(filter) {
    case 'active':
      filtered = agents.filter(a => a.is_active === true || a.is_active === null || a.is_active === undefined);
      break;
    case 'inactive':
      filtered = agents.filter(a => a.is_active === false);
      break;
    case 'performers':
      // For now, show all as we don't have performance data
      filtered = agents;
      break;
    default:
      filtered = agents;
  }
  
  displayAgents(filtered);
};