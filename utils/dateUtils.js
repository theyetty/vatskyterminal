function hhmmToUTCTime(hhmm) {
    const hours = parseInt(hhmm.substring(0, 2), 10);
    const minutes = parseInt(hhmm.substring(2), 10);
    const now = new Date();
    const date =  new Date(Date.UTC(1970, 0, 1, parseInt(hhmm.substring(0, 2), 10), parseInt(hhmm.substring(2), 10)));
    date.setFullYear(now.getFullYear());
    date.setMonth(now.getMonth());
    date.setDate(now.getDate());

    return date.toISOString();
}
function UTCTimeToHHMM(isoString) {
    const date = new Date(isoString);

    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();

    const hhmm = (hours < 10 ? '0' : '') + hours.toString() + (minutes < 10 ? '0' : '') + minutes.toString();

    return hhmm;
}


function calculateExpectedArrivalUTC(deptime, enrouteTime) {
    const departureTimeUTC = hhmmToUTCTime(deptime); 
    const departureDate = new Date(Date.UTC(1970, 0, 1, parseInt(deptime.substring(0, 2), 10), parseInt(deptime.substring(2), 10)));
    
    const now = new Date();
    
    departureDate.setFullYear(now.getFullYear());
    departureDate.setMonth(now.getMonth());
    departureDate.setDate(now.getDate());
    
    const enrouteMinutes = parseInt(enrouteTime.substring(0, 2), 10) * 60 + parseInt(enrouteTime.substring(2), 10);

    const arrivalDate = new Date(departureDate.getTime() + enrouteMinutes * 60000); // Convert minutes to milliseconds

    return arrivalDate.toISOString();
}


function calculateTimeRemaining(arrivalTimeUTC, deptime, logonTime) {
    const now = new Date();

    const deptimeHours = parseInt(deptime.substring(0, 2), 10);
    const deptimeMinutes = parseInt(deptime.substring(2, 4), 10);

    const deptimeDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                                          deptimeHours, deptimeMinutes));

    const logonTimeDate = new Date(logonTime);

    const arrivalHours = parseInt(arrivalTimeUTC.substring(0, 2), 10);
    const arrivalMinutes = parseInt(arrivalTimeUTC.substring(3, 5), 10);

    const arrivalTimeDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                                              arrivalHours, arrivalMinutes));

    if (deptimeDate > now && logonTimeDate.getUTCDate() < now.getUTCDate()) {
        deptimeDate.setUTCDate(deptimeDate.getUTCDate() - 1); // Set deptime to yesterday
        arrivalTimeDate.setUTCDate(arrivalTimeDate.getUTCDate() - 1); // Set arrivalTime to yesterday
    }

    let timeDiff = (arrivalTimeDate.getTime() - now.getTime()) / 60000; // Convert milliseconds to minutes

    return Math.floor(timeDiff);
}

module.exports = {
    hhmmToUTCTime,
    UTCTimeToHHMM,
    calculateExpectedArrivalUTC,
    calculateTimeRemaining,
};

