// Import component - CSV import functionality, add agent form

window.importAgentsFromCSVNew = async function() {
  const fileInput = document.getElementById('csvFileInputNew');
  const statusSpan = document.getElementById('importStatusNew');
  
  if (!fileInput.files.length) {
    alert('Please select a CSV file first');
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  
  statusSpan.textContent = 'Reading file...';
  
  reader.onload = async function(e) {
    const csvData = e.target.result;
    
    try {
      statusSpan.textContent = 'Sending to server...';
      
      const response = await fetch('https://webrealtor-backend.onrender.com/api/import-dbpr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: csvData })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        statusSpan.textContent = '✅ Imported ' + result.imported + ' agents!';
        alert('Successfully imported ' + result.imported + ' agents!');
        loadAgents();
      } else {
        statusSpan.textContent = '❌ Error: ' + result.error;
        alert('Import failed: ' + result.error);
      }
    } catch (err) {
      statusSpan.textContent = '❌ Error: ' + err.message;
      alert('Import failed: ' + err.message);
    }
  };
  
  reader.readAsText(file);
};

// Add Agent Form Handler
document.addEventListener('DOMContentLoaded', function() {
  const addAgentForm = document.getElementById('addAgentFormNew');
  if (addAgentForm) {
    addAgentForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const name = document.getElementById('newAgentName').value.trim();
      const email = document.getElementById('newAgentEmail').value.trim();
      const phone = document.getElementById('newAgentPhone').value.trim();
      const brokerage = document.getElementById('newAgentBrokerage').value.trim();
      const citiesInput = document.getElementById('newAgentCities').value.trim();
      const specialtiesInput = document.getElementById('newAgentSpecialties').value.trim();
      const languagesInput = document.getElementById('newAgentLanguages').value.trim();
      const state = document.getElementById('newAgentState').value;
      
      if (!name || !email) {
        alert('Name and email are required');
        return;
      }
      
      const service_cities = citiesInput ? citiesInput.split(',').map(c => c.trim()) : [];
      if (state && !service_cities.includes(state)) {
        service_cities.push(state);
      }
      
      const specialties = specialtiesInput ? specialtiesInput.split(',').map(s => s.trim()) : [];
      const languages = languagesInput ? languagesInput.split(',').map(l => l.trim()) : ['English'];
      
      try {
        const supabaseClient = window.getSupabaseClient();
        const { data, error } = await supabaseClient.from('agents').insert({
          name: name,
          email: email,
          phone: phone || null,
          brokerage: brokerage || null,
          service_cities: service_cities,
          service_states: [state],
          specialties: specialties,
          languages: languages,
          is_active: true
        });
        
        if (error) {
          alert('Error adding agent: ' + error.message);
        } else {
          alert('Agent added successfully!');
          // Clear form
          addAgentForm.reset();
          // Reload agents
          loadAgents();
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }
});