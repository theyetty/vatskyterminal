const express = require('express');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises; // Import the promise-based methods
const cors = require('cors');
const { fetchVatsimData } = require('./services/vatsimService');
const {  searchAirports, fetchAllAirports } = require('./services/airportService');
const { fetchAllAirlines } = require('./services/airlineService');
const { getPilotStatus } = require('./utils/distanceUtils');
const { calculateExpectedArrivalUTC, hhmmToUTCTime,UTCTimeToHHMM, calculateTimeRemainingTillDestination, calculateTimeRemainingTillDeparture } = require('./utils/dateUtils');
const { Country, State } = require('country-state-city');

const app = express();
const PORT = 3000;
app.use(cors());


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('/data', path.join(__dirname, 'data'));


app.get('/api/airports/search', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.json([]);
    }

    try {
        const matchingAirports = await searchAirports(q);
        res.json(matchingAirports);
    } catch (error) {
        console.error("Error handling airports search:", error);
        res.status(500).send('Error handling airports search');
    }
});

app.get('/api/flights/:icao', async (req, res) => {
    const icao = req.params.icao.toUpperCase();

    try {
        const flightData = await getFlight(icao);

        res.json(flightData);
    } catch (error) {
        console.error("Error fetching flight data for ICAO:", icao, error);
        res.status(500).send('Error fetching flight data');
    }
});

async function getFlight(icao){

    try {
        const vatsimData = await fetchVatsimData();
        const allAirports = await fetchAllAirports(); 
        const allAirlines = await fetchAllAirlines();


        let departures = [];
        let arrivals = [];
        
        for (const pilot of vatsimData.pilots) {
            if (pilot.flight_plan) {
                const departureTimeUTC = hhmmToUTCTime(pilot.flight_plan.deptime);
                const departureTime = pilot.flight_plan.deptime;
                const expectedArrivalUTC = calculateExpectedArrivalUTC(pilot.flight_plan.deptime, pilot.flight_plan.enroute_time);


                const timeRemainingToDestination = calculateTimeRemainingTillDestination(expectedArrivalUTC);
                const timeRemainingUntilDeparture = calculateTimeRemainingTillDeparture(departureTime);

                const departureAirportData = allAirports[pilot.flight_plan.departure.toUpperCase()];
                const arrivalAirportData = allAirports[pilot.flight_plan.arrival.toUpperCase()];
        
                const departureAirportName = getAirportName(departureAirportData);
                const departureCountry = getCountryName(departureAirportData);
                const departureState = getStateName(departureAirportData);
                const departureCity = getAirportCity(departureAirportData);
        
                const arrivalAirportName = getAirportName(arrivalAirportData);
                const arrivalCountry = getCountryName(arrivalAirportData);
                const arrivalState = getStateName(arrivalAirportData);
                const arrivalCity = getAirportCity(arrivalAirportData);


                const status = getPilotStatus(
                    pilot, 
                    departureAirportData, 
                    arrivalAirportData, 
                    10, 
                    timeRemainingUntilDeparture, 
                    timeRemainingToDestination, 
                    expectedArrivalUTC
                );
                const airlineIcao = pilot.callsign.substring(0, 3).toUpperCase();
                const airlineData = allAirlines[airlineIcao];
                const aircraftTypeCode = pilot.flight_plan.aircraft.split('/')[0];

                const aircraftIcon = await checkAircraftImageExists(aircraftTypeCode);

                let flight = {
                    cid: pilot.cid,
                    name: pilot.name,
                    callsign: pilot.callsign,
                    departure: {
                        icao: pilot.flight_plan.departure,
                        departureTime: departureTimeUTC,
                        airportName: departureAirportName,
                        country: departureCountry,
                        state: departureState,
                        city: departureCity ?? departureAirportName,
                        timeLeft: timeRemainingUntilDeparture
                    },
                    arrival: {
                        icao: pilot.flight_plan.arrival,
                        arrivalTime: expectedArrivalUTC,
                        airportName: arrivalAirportName,
                        country: arrivalCountry,
                        state: arrivalState,
                        city: arrivalCity ?? arrivalAirportName,
                        timeLeft: timeRemainingToDestination
                    },
                    aircraft: {
                        name: pilot.flight_plan.aircraft,
                        airlineName: airlineData ? airlineData.name : null,
                        airlineLogo: airlineData?.logo ?? 'https://images.kiwi.com/airlines/64x64/airlines.png',
                        aircraftIcon: aircraftIcon
                    },
                    location: {
                        altitude: pilot.altitude,
                        groundspeed: pilot.groundspeed,
                        status,
                        longitude: pilot.longitude,
                        latitude: pilot.latitude,
                        heading: pilot.heading
                    }
                };


                if (pilot.flight_plan.departure === icao) {
                    departures.push(flight);
                }

                if (pilot.flight_plan.arrival === icao) {
                    arrivals.push(flight);
                }
            }
        }
        departures.sort((a, b) => new Date(b.departure.departureTime) - new Date(a.departure.departureTime));
        arrivals.sort((b, a) => new Date(b.arrival.arrivalTime) - new Date(a.arrival.arrivalTime));
        
        return({ departures, arrivals });
    } catch (error) {
        console.error("Error fetching or processing flight data:", error);
        return {};
    }
}

async function checkAircraftImageExists(typeCode) {
    const imagePath = path.join(__dirname, '/public/images/', `${typeCode}.svg`);
    try {
        await fsp.access(imagePath);
        return `/images/${typeCode}.svg`; // Return the relative path if the file exists
    } catch (error) {
        return '/images/Unidentified.svg'; // Return the default image path if the file does not exist
    }
}

function getAirportName(airportData) {
    return airportData ? airportData.name : "Unknown";
}
function getAirportLocation(airportData) {
    if (airportData) {
        return {
            lat: airportData.lat,
            lng: airportData.lon
        };
    } else {
        return {
            lat: 0,
            lng: 0
        };
    }
}

function getAirportCity(airportData) {
    return airportData ? airportData.city : "Unknown";
}
function getCountryName(airportData) {
    return airportData && Country.getCountryByCode(airportData.country) ? 
           Country.getCountryByCode(airportData.country).name : 
           "Unknown Country";
}
function getStateName(airportData) {
    if (airportData && airportData.state) {
        const stateCode = airportData.state.split('-').pop();
        const stateObj = State.getStateByCodeAndCountry(stateCode, airportData.country);
        return stateObj ? stateObj.name : "Unknown State";
    }
    return "Unknown State";
}
app.get('/privacy-policy', (req, res) => {
    res.render('privacy');
});

app.get('/:icao', async (req, res) => {
    const icao = req.params.icao.toUpperCase();

    try {
        const { departures, arrivals } = await getFlight(icao);

        departures.sort((a, b) => new Date(a.departure.departureTime) - new Date(b.departure.departureTime));
        arrivals.sort((a, b) => new Date(a.arrival.arrivalTime) - new Date(b.arrival.arrivalTime));

        res.render('airport', { departures, arrivals });
    } catch (error) {
        console.error("Error fetching flight data for ICAO:", error);
        res.status(500).send('Error fetching flight data');
    }
});

app.get('/:icao/map', async (req, res) => {
    const icao = req.params.icao.toUpperCase();
    const allAirports = await fetchAllAirports(); 
    const location = getAirportLocation(allAirports[icao]);
    let center;

        center = {
            lat: location.lat,
            lng: location.lng
        };

    try {
        const flightData = await getFlight(icao);

        res.render('airportMap', { flightData, icao, center, selectedCallsign: '' });


    } catch (error) {
        console.error("Error fetching flight data for ICAO:", icao, error);
        res.status(500).send('Error fetching flight data for map view');
    }
});


app.get('/:icao/map/:callsign', async (req, res) => {
    const icao = req.params.icao.toUpperCase();
    const callsign = req.params.callsign.toUpperCase();

    try {
        const flightData = await getFlight(icao); // Assuming this returns all flight data for the airport

        let center;
        const specificFlight = flightData.departures.concat(flightData.arrivals).find(flight => flight.callsign === callsign);

        if (specificFlight) {
            // Use the specific flight's coordinates if found
            center = { lat: specificFlight.location.latitude  + 0.05, lng: specificFlight.location.longitude };
        } else {
            // If no specific flight found, try to use the first available flight from departures or arrivals
            const firstAvailableFlight = flightData.departures[0] || flightData.arrivals[0];

            if (firstAvailableFlight) {
                // Assuming departure or arrival airport of the first flight can represent the airport coordinates
                center = firstAvailableFlight.departure.icao === icao 
                    ? { lat: firstAvailableFlight.departure.latitude  + 0.05, lng: firstAvailableFlight.departure.longitude }
                    : { lat: firstAvailableFlight.arrival.latitude  + 0.05, lng: firstAvailableFlight.arrival.longitude };
            } else {
                // Fallback coordinates if no flights are found (you might want to handle this case differently)
                center = { lat: 0, lng: 0 }; // Default or error coordinates
            }
        }

        res.render('airportMap', { 
            flightData, 
            icao, 
            center: center,
            selectedCallsign: callsign ? callsign : null 
        });
    } catch (error) {
        console.error("Error fetching flight data:", error);
        res.status(500).send('Error fetching flight data for map view');
    }
});

app.get('/', (req, res) => {
    res.render('index');
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
