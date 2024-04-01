const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { fetchVatsimData } = require('./services/vatsimService');
const {  searchAirports, fetchAllAirports } = require('./services/airportService');
const { fetchAllAirlines } = require('./services/airlineService');
const { getPilotStatus } = require('./utils/distanceUtils');
const { calculateExpectedArrivalUTC, hhmmToUTCTime,UTCTimeToHHMM, calculateTimeRemaining } = require('./utils/dateUtils');
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

// app.get('/api/flights/:icao', async (req, res) => {
//     const icao = req.params.icao.toUpperCase();

//     try {
//         const flightData = await getFlight(icao);

//         res.json(flightData);
//     } catch (error) {
//         console.error("Error fetching flight data for ICAO:", icao, error);
//         res.status(500).send('Error fetching flight data');
//     }
// });

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


                const timeRemainingToDestination = calculateTimeRemaining(UTCTimeToHHMM(expectedArrivalUTC), pilot.flight_plan.deptime, pilot.logon_time);
                const timeRemainingUntilDeparture = calculateTimeRemaining(departureTime, departureTime, pilot.logon_time);

                const departureAirportData = allAirports[pilot.flight_plan.departure.toUpperCase()];
                const arrivalAirportData = allAirports[pilot.flight_plan.arrival.toUpperCase()];
        
                const departureAirportName = getAirportName(departureAirportData);
                const departureCountry = getCountryName(departureAirportData);
                const departureState = getStateName(departureAirportData);
        
                const arrivalAirportName = getAirportName(arrivalAirportData);
                const arrivalCountry = getCountryName(arrivalAirportData);
                const arrivalState = getStateName(arrivalAirportData);

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
                        timeLeft: timeRemainingUntilDeparture
                    },
                    arrival: {
                        icao: pilot.flight_plan.arrival,
                        arrivalTime: expectedArrivalUTC,
                        airportName: arrivalAirportName,
                        country: arrivalCountry,
                        state: arrivalState,
                        timeLeft: timeRemainingToDestination
                    },
                    aircraft: {
                        name: pilot.flight_plan.aircraft,
                        airlineName: airlineData ? airlineData.name : null,
                        airlineLogo: airlineData?.logo ?? 'https://images.kiwi.com/airlines/64x64/airlines.png'
    
                    },
                    location: {
                        altitude: pilot.altitude,
                        groundspeed: pilot.groundspeed,
                        status
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
        departures.sort((b, a) => new Date(a.departure.departureTime) - new Date(b.departure.departureTime));
        arrivals.sort((b, a) => new Date(a.arrival.arrivalTime) - new Date(b.arrival.arrivalTime));
        return({ departures, arrivals });
    } catch (error) {
        console.error("Error fetching or processing flight data:", error);
        return {};
    }
}

function getAirportName(airportData) {
    return airportData ? airportData.name : "Unknown";
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

// app.get('/:icao', async (req, res) => {
//     const icao = req.params.icao.toUpperCase();

//     try {
//         const { departures, arrivals } = await getFlight(icao);

//         departures.sort((a, b) => new Date(a.departure.departureTime) - new Date(b.departure.departureTime));
//         arrivals.sort((a, b) => new Date(a.arrival.arrivalTime) - new Date(b.arrival.arrivalTime));

//         res.render('airport', { departures, arrivals });
//     } catch (error) {
//         console.error("Error fetching flight data for ICAO:", error);
//         res.status(500).send('Error fetching flight data');
//     }
// });



app.get('/', (req, res) => {
    res.render('index');
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
