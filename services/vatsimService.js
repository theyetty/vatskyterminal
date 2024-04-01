const axios = require('axios');

async function fetchVatsimData() {
    const url = 'https://data.vatsim.net/v3/vatsim-data.json'; 
    try {
        const response = await axios.get(url);
        return response.data; 
    } catch (error) {
        console.error(`Failed to fetch VATSIM data: ${error.message}`);
        throw error; 
    }
}

module.exports = {
    fetchVatsimData
};
