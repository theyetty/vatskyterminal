let countdownValue = 30;

function updateCountdown() {
    countdownValue--;
    document.getElementById('countdown').textContent = countdownValue;

    if (countdownValue <= 0) {
        countdownValue = 30;
    }
}

async function fetchAndUpdateData() {
    try {
        const path = window.location.pathname;
        const icaoCode = path.substring(1);

        const response = await fetch(`/api/flights/${icaoCode}`);
        const { departures, arrivals } = await response.json();

        const departuresTbody = document.querySelector('.departures tbody');
        departuresTbody.innerHTML = ''; // Clear existing rows
        departures.forEach(flight => {
            const { message, className } = getStatusMessage(flight.location.status, 'departure');
            const row = `<tr>
                <td>${new Date(flight.departure.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                <td><img src="${flight.aircraft.airlineLogo}" alt="Airline Logo" class="airline-logo"></td>
                <td>${flight.callsign}</td>
                <td>${flight.arrival.airportName} (<a href="/${flight.arrival.icao}">${flight.arrival.icao}</a>)</td>
                <td class="${className}">${message}</td>
            </tr>`;
            departuresTbody.innerHTML += row;
        });

        const arrivalsTbody = document.querySelector('.arrivals tbody');
        arrivalsTbody.innerHTML = ''; 
        arrivals.forEach(flight => {
            const { message, className } = getStatusMessage(flight.location.status, 'arrival');
            const row = `<tr>
                <td>${new Date(flight.arrival.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                <td><img src="${flight.aircraft.airlineLogo}" alt="Airline Logo" class="airline-logo"></td>
                <td>${flight.callsign}</td>
                <td>${flight.departure.airportName} (<a href="/${flight.departure.icao}">${flight.departure.icao}</a>)</td>
                <td class="${className}">${message}</td>
            </tr>`;
            arrivalsTbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error fetching or updating flight data:', error);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    fetchAndUpdateData(); // Load initial data
    setInterval(updateCountdown, 1000); 
    setInterval(fetchAndUpdateData, 30000); // Refresh data every 30 seconds
});

function getStatusMessage(status, flightPhase) {
    let message;
    let className;

    if (flightPhase === 'departure') {
        switch (status.statusText) {
            case 'DEPARTURE_DELAYED':
                message = `Delayed by ${status.delayMinutes} minutes`;
                className = 'red';
                break;
            case 'DEPARTURE_TAXI':
                message = 'Gate Closed';
                className = 'orange';
                break;
            case 'DEPARTURE_GATE':
                message = 'Boarding at Gate';
                className = 'green';
                break;
            default:
                message = 'Departed';
                className = 'blue';
                break;
        }
    } else { 
        switch (status.statusText) {
            case 'ARRIVAL_FLYING_DELAYED':
            case 'EN_ROUTE_DELAYED':
            case 'ARRIVAL_DELAYED':
                message = `Expected at ${new Date(status.newETA).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
                className = 'red';
                break;
            case 'ARRIVAL_TAXI_DELAYED':
                 message = `Taxing to gate (${status.delayMinutes} minute delay)`;
            case 'ARRIVAL_TAXI':
                message = 'Taxing to gate';
                className = 'white';
            case 'ARRIVAL_GATE':
                message = 'Arrived at gate';
                className = 'white';
                break;
            case 'EN_ROUTE_EARLY':
                message = 'Arriving Early';
                className = 'status-early';
                break;
            case 'EN_ROUTE':
                message = 'En-Route';
                className = 'white';
                break;
            default:
                message = 'Scheduled';
                className = 'white';
                break;

        }
    }

    return { message, className };
}
