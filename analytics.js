// Analytics component - charts and analytics functions

async function loadAnalytics() {
  try {
    const supabaseClient = window.getSupabaseClient();
    const { data: clients } = await supabaseClient.from('clients').select('*');
    const { data: referrals } = await supabaseClient.from('referrals').select('*');
    const { data: agents } = await supabaseClient.from('agents').select('*');
    
    const totalLeads = clients?.length || 0;
    const matchedReferrals = referrals?.filter(r => r.status === 'matched' || r.status === 'accepted').length || 0;
    const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0;
    const conversionRate = matchedReferrals > 0 ? Math.round((completedReferrals / matchedReferrals) * 100) : 0;
    const activeAgentsCount = agents?.filter(a => a.is_active).length || 0;
    
    // Calculate avg match score
    let avgMatchScore = 0;
    try {
      const { data: referralsWithScore } = await supabaseClient.from('referrals').select('match_score').not('match_score', 'is', null);
      if (referralsWithScore && referralsWithScore.length > 0) {
        avgMatchScore = Math.round((referralsWithScore.reduce((sum, r) => sum + r.match_score, 0) / referralsWithScore.length) * 100);
      }
    } catch (e) {
      // column might not exist
    }
    
    if (document.getElementById('totalLeads')) document.getElementById('totalLeads').textContent = totalLeads;
    if (document.getElementById('conversionRate')) document.getElementById('conversionRate').textContent = conversionRate + '%';
    if (document.getElementById('avgMatchScore')) document.getElementById('avgMatchScore').textContent = avgMatchScore + '%';
    if (document.getElementById('activeAgents')) document.getElementById('activeAgents').textContent = activeAgentsCount;
    
    // Traffic Sources - mock for now based on client sources
    const sourceCounts = {};
    clients?.forEach(c => {
      const source = c.source_website || 'Direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    const trafficHtml = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => `
        <div class="flex justify-between items-center">
          <span class="text-sm text-white">${source}</span>
          <span class="text-sm font-bold text-cyan-400">${count}</span>
        </div>
      `).join('') || '<p class="text-slate-400">No data</p>';
    if (document.getElementById('trafficSources')) document.getElementById('trafficSources').innerHTML = trafficHtml;
    
    // Language Distribution
    const langCounts = {};
    clients?.forEach(c => {
      const lang = c.preferred_language || 'English';
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    });
    
    const langHtml = Object.entries(langCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, count]) => `
        <div class="flex justify-between items-center">
          <span class="text-sm text-white">${lang}</span>
          <span class="text-sm font-bold text-green-400">${count}</span>
        </div>
      `).join('') || '<p class="text-slate-400">No data</p>';
    if (document.getElementById('languageDistribution')) document.getElementById('languageDistribution').innerHTML = langHtml;
    
    // Top Destinations
    const destCounts = {};
    clients?.forEach(c => {
      const dest = c.desired_city || 'Unknown';
      destCounts[dest] = (destCounts[dest] || 0) + 1;
    });
    
    const destHtml = Object.entries(destCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dest, count]) => `
        <div class="flex justify-between items-center">
          <span class="text-sm text-white">${dest}</span>
          <span class="text-sm font-bold text-purple-400">${count}</span>
        </div>
      `).join('') || '<p class="text-slate-400">No data</p>';
    if (document.getElementById('topDestinations')) document.getElementById('topDestinations').innerHTML = destHtml;
    
    // Conversion Funnel
    const funnelHtml = [
      { name: 'Total Leads', count: totalLeads, color: 'from-cyan-500 to-blue-500' },
      { name: 'Matched', count: matchedReferrals, color: 'from-blue-500 to-purple-500' },
      { name: 'Completed', count: completedReferrals, color: 'from-green-500 to-emerald-500' }
    ].map(stage => {
      const percentage = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
      return `
        <div class="flex items-center gap-3">
          <div class="w-20 text-right">
            <span class="text-sm font-semibold text-white">${stage.name}</span>
            <div class="text-xs text-slate-400">${stage.count}</div>
          </div>
          <div class="flex-1">
            <div class="h-6 bg-gradient-to-r ${stage.color} rounded flex items-center justify-center" style="width: ${Math.max(percentage, 5)}%">
              <span class="text-xs font-bold text-white">${percentage}%</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    if (document.getElementById('conversionFunnel')) document.getElementById('conversionFunnel').innerHTML = funnelHtml;
    
    // Specialty Demand
    const specCounts = {};
    clients?.forEach(c => {
      (c.agent_specialties || []).forEach(s => {
        specCounts[s] = (specCounts[s] || 0) + 1;
      });
    });
    
    const specHtml = Object.entries(specCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([spec, count]) => `
        <div class="flex justify-between items-center">
          <span class="text-sm text-white">${spec}</span>
          <span class="text-sm font-bold text-yellow-400">${count}</span>
        </div>
      `).join('') || '<p class="text-slate-400">No data</p>';
    if (document.getElementById('specialtyDemand')) document.getElementById('specialtyDemand').innerHTML = specHtml;
    
    // Revenue Potential
    const totalBudget = clients?.reduce((sum, c) => sum + (c.budget_amount || 0), 0) || 0;
    const avgBudget = totalLeads > 0 ? Math.round(totalBudget / totalLeads) : 0;
    const highValueLeads = clients?.filter(c => c.budget_amount >= 500000).length || 0;
    
    if (document.getElementById('totalRevenuePotential')) document.getElementById('totalRevenuePotential').textContent = '$' + totalBudget.toLocaleString();
    if (document.getElementById('avgClientBudget')) document.getElementById('avgClientBudget').textContent = '$' + avgBudget.toLocaleString();
    if (document.getElementById('highValueLeads')) document.getElementById('highValueLeads').textContent = highValueLeads;
    
  } catch (e) { console.error('loadAnalytics error:', e); }
}