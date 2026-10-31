import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const mapController = {};

// Programmatically fetch coordinates from OneMap API and update the map marker
mapController.fetchPostalCodeCoordinates = async (req, res) => {
  let postalCode = req.params.postalCode;
  console.log(postalCode);

  if (!postalCode || postalCode.length !== 6) {
    res.send('Invalid 6-digit postal code.');
    return;
  }

  try {
    // 1. Query the OneMap Elastic Search API using the postal code string
    const targetUrl = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${postalCode}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
    const authToken = process.env.ONEMAP_API_TOKEN;
    // console.log('authToken', authToken)
    const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `${authToken}`,  // API token for authorization
        }
      });
      // .then(response => response.json())  // Parse response as JSON
      // .then(data => console.log(data))     // Log the data to the console
      // .catch(error => console.error('Error:', error));  // Log any errors;

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      res.send(data);
      // console.log('server map data:', data)
    } else {
      res.send('No matching location found for this postal code.');
      console.log('No matching location found for this postal code.');
    }
  } catch (error) {
    res.send('Failed to geocode postal code via OneMap');
    console.error('Failed to geocode postal code via OneMap:', error);
  }
}


export default mapController;