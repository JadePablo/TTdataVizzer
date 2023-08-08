/**
 * Checks if the provided API key in a request matches the expected API key.
 * 
 * @param {Object} request - The JSON object representing the incoming request.
 * @return {boolean} Returns true if the provided API key matches the expected API key, 
 *                   otherwise returns false.
 */

function checkKey(request) {
    // Assuming process.env.API_KEY contains the expected API key
    const expectedApiKey = process.env.API_KEY;
    // Check if the request contains an 'api_key' field

    const keys = Object.keys(request);

    if (keys.length == 0 || keys[0] != 'api_key') {
        return false;
    }
    if (request['api_key'] != expectedApiKey) {
        return false;
    }

    return true;
}

export default checkKey;
