function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

function calculateRemainingFlightTime(distance, groundSpeed) {
    if (groundSpeed <= 0) return Infinity;
    return (distance / groundSpeed) * 60;
}
function calculateNewArrivalTime(distanceToArrival, pilot) {
    // Create current date and time object 
    const plannedTime = new Date();

    // Check if distanceToArrival is not a finite number, return original arrival time
    if (!Number.isFinite(distanceToArrival)) {
        return {
            delayed: false,
            newETA: plannedTime.toISOString(),
            minsFromNow: 0
        };
    }

    // Calculate duration in hours 
    const durationHours = pilot.groundspeed !== 0 ? distanceToArrival / pilot.groundspeed : 0;

    // Calculate new arrival time
    const newArrivalTime = new Date(plannedTime.getTime() + (durationHours * 60 * 60 * 1000));

    // Add grace period of 20 minutes to the planned arrival time
    const plannedTimeWithGrace = new Date(plannedTime.getTime() + (20 * 60 * 1000));

    // Check if the new arrival time is within the grace period
    const delayed = newArrivalTime > plannedTimeWithGrace;

    // Calculate the number of minutes from now to the new arrival time
    const diffMilliseconds = newArrivalTime - plannedTime;
    const diffMinutes = Math.round(diffMilliseconds / 1000 / 60);

    // Return object with delayed status, new estimated time of arrival, and minsFromNow
    return {
        delayed: delayed,
        newETA: newArrivalTime.toISOString(), // Convert to ISO string for consistency
        minsFromNow: diffMinutes
    };
}



function getPilotStatus(
    pilot,
    departureAirport,
    arrivalAirport,
    threshold,
    timeRemainingUntilDeparture,
    timeRemainingToDestination,
    expectedArrivalUTC
) {
    if (!departureAirport && !arrivalAirport) {
        return { statusText: 'UNKNOWN_LOCATION', delayMinutes: 0 };
    }

    const distanceToDeparture = departureAirport ? calculateDistance(pilot.latitude, pilot.longitude, departureAirport.lat, departureAirport.lon) : Infinity;
    const distanceToArrival = arrivalAirport ? calculateDistance(pilot.latitude, pilot.longitude, arrivalAirport.lat, arrivalAirport.lon) : Infinity;

    const isMoving = pilot.groundspeed >= 1;
    const isInAir = pilot.altitude > 1000;

    // At the departure airport
    if (timeRemainingUntilDeparture < 0 && pilot.groundspeed == 0 && distanceToArrival > threshold) {
        const delayMinutes = Math.abs(timeRemainingUntilDeparture);
        return { statusText: 'DEPARTURE_DELAYED', delayMinutes: delayMinutes };
    }

    if (distanceToDeparture < threshold && pilot.groundspeed == 0) {
        return { statusText: 'DEPARTURE_GATE' };
    }

    if (distanceToDeparture < threshold && pilot.groundspeed > 0) {
        return { statusText: 'DEPARTURE_TAXI' };
    }



    // Define a delay threshold in minutes
    const DELAY_THRESHOLD = 20;

    // In the air
    if (isInAir && isMoving) {
        const newArrivalEstimation = calculateNewArrivalTime(distanceToArrival, pilot);
        const scheduledArrivalDate = new Date(expectedArrivalUTC);
        const newETA = new Date(newArrivalEstimation.newETA);

        const delayMinutes = Math.round((newETA - scheduledArrivalDate) / 1000 / 60);

        if (delayMinutes > DELAY_THRESHOLD) {
            // Flight is delayed beyond the threshold
            return { statusText: `EN_ROUTE_DELAYED`, delayMinutes: delayMinutes, newETA: newArrivalEstimation.newETA };
        } else if (delayMinutes < -DELAY_THRESHOLD) {
            // Flight is arriving early, beyond the threshold
            return { statusText: 'EN_ROUTE_EARLY', delayMinutes: delayMinutes };
        } else {
            // Flight is within the delay threshold, considered on time
            return { statusText: 'EN_ROUTE_ON_TIME', delayMinutes: 0 };
        }
    }

    // At the arrival airport
    if (distanceToArrival <= threshold) {
        const newArrivalEstimation = calculateNewArrivalTime(distanceToArrival, pilot);
        const isFlying = pilot.groundspeed > 50; // Above 50 knots means still flying
        const scheduledArrivalDate = new Date(expectedArrivalUTC);
        const newETA = new Date(newArrivalEstimation.newETA);

        const delayMinutes = Math.round((newETA - scheduledArrivalDate) / 1000 / 60);

        if (delayMinutes > DELAY_THRESHOLD) {
            // Flight is delayed beyond the threshold
            return { statusText: isFlying ? `ARRIVAL_FLYING_DELAYED` : `ARRIVAL_TAXI_DELAYED`, delayMinutes: delayMinutes, newETA: newArrivalEstimation.newETA };
        } else if (delayMinutes < -DELAY_THRESHOLD) {
            // Flight is arriving early, beyond the threshold
            return { statusText: isFlying ? 'ARRIVAL_FLYING_EARLY' : 'ARRIVAL_TAXI_EARLY', delayMinutes: delayMinutes };
        } else {
            // Flight is within the delay threshold, considered on time
            return { statusText: isFlying ? 'ARRIVAL_FLYING_ON_TIME' : 'ARRIVAL_GATE_ON_TIME', delayMinutes: 0 };
        }
    }


    return { statusText: 'UNKNOWN_STATUS', delayMinutes: 0 };
}






module.exports = {
    calculateDistance,
    calculateRemainingFlightTime,
    getPilotStatus
};
