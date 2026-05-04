// Import component - CSV import functionality

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