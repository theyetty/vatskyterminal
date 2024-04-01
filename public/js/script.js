document.getElementById('airport-search-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const query = document.getElementById('airportInput').value;

  if (!query) {
      alert('Please enter a search query.');
      return;
  }

  const response = await fetch(`/api/airports/search?q=${encodeURIComponent(query)}`);
  const airports = await response.json();

  if (airports.length > 1) {
      const select = document.getElementById('airportSelection');
      const message = document.getElementById('airportSelectionMessage');
      const button = document.getElementById('selectAirportButton');

      select.innerHTML = '';
      message.style.display = 'none';
      button.style.display = 'none';

      airports.forEach(airport => {
          const option = document.createElement('option');
          option.value = airport.icao;
          option.textContent = `${airport.name} (${airport.icao})`;
          select.appendChild(option);
      });

      select.style.display = '';
      message.style.display = '';
      button.style.display = '';

  } else if (airports.length === 1) {
      window.location.href = `/${airports[0].icao}`;
  } else {
      alert('No airports found. Please try a different search.');
  }
});

document.getElementById('selectAirportButton').addEventListener('click', function() {
  const select = document.getElementById('airportSelection');
  const icao = select.value;
  if (icao) {
      window.location.href = `/${icao}`;
  } else {
      alert('Please select an airport from the dropdown.');
  }
});
