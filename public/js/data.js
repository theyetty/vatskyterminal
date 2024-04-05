let countdownValue = 30;
function updateCountdown() {
    countdownValue--;
    document.getElementById('countdown').textContent = countdownValue;

    if (countdownValue <= 0) {
        countdownValue = 30;
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
            case 'ARRIVAL_TAXI_EARLY':
                message = 'Taxing to gate';
                className = 'white';
            case 'ARRIVAL_GATE':
            case 'ARRIVAL_GATE_ON_TIME':
                message = 'Arrived at gate';
                className = 'white';
                break;
            case 'ARRIVAL_FLYING_EARLY':
                message = 'Arriving Early';
                className = 'status-early';
                break;
            case 'EN_ROUTE':
            case 'EN_ROUTE_EARLY':
            case 'EN_ROUTE_ON_TIME':
            case 'ARRIVAL_FLYING_ON_TIME':
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
