const fs = require('fs').promises;
const path = require('path');

async function fetchAirlineData(icao) {
    const filePath = path.join(process.cwd(), 'data', 'airlines', 'airlines.json');
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const airlines = JSON.parse(fileContent);
        
        // Find the airline by ICAO code
        const airline = airlines.find(airline => airline.icao.toUpperCase() === icao.toUpperCase());
        
        return airline || null;
    } catch (error) {
        console.error(`Failed to read airline data: ${error.message}`);
        throw error;
    }
}
async function fetchAllAirlines() {
    const filePath = path.join(process.cwd(), 'data', 'airlines', 'airlines.json');
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
}

async function fetchAirlineImage(icao) {
    try {
        // Use fetchAirlineData to get airline data by ICAO code
        const airlineData = await fetchAirlineData(icao);

        // Check if airline data was found and has a logo
        if (airlineData && airlineData.logo) {
            return airlineData.logo;
        } else if (airlineData && airlineData.iata) {
            // If no logo, generate a logo URL using the airline's IATA code
            const generatedLogoUrl = `https://images.kiwi.com/airlines/64/${airlineData.iata}.png`;
            return generatedLogoUrl;
        } else {
            // If no airline data found or it lacks an IATA code, return null or a default image
            return null; // Or a default image URL if you prefer
        }
    } catch (error) {
        console.error(`Failed to fetch airline image: ${error.message}`);
        throw error;
    }
}
module.exports = {
    fetchAllAirlines
};
