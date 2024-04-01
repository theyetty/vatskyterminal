const fs = require('fs').promises;
const path = require('path');

async function fetchAirportData(icao) {
    const filePath = path.join(process.cwd(), 'data', 'airports', 'airports.json');
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const airports = JSON.parse(fileContent);
        return airports[icao.toUpperCase()] || null;
    } catch (error) {
        console.error(`Failed to read airport data: ${error.message}`);
        throw error; 
    }
}
async function fetchAllAirports() {
    const filePath = path.join(process.cwd(), 'data', 'airports', 'airports.json');
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
}

async function searchAirports(query) {
    try {
        const airports = await fetchAllAirports();
        const searchTerm = normalizeString(query);

        return Object.values(airports).filter(airport =>
            normalizeString(airport.icao).includes(searchTerm) ||
            normalizeString(airport.name).includes(searchTerm)
        );
    } catch (error) {
        console.error("Error searching airports:", error);
        throw error;
    }
}

function normalizeString(str) {
    return str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

module.exports = {
    fetchAirportData,
    searchAirports,
    fetchAllAirports
};
