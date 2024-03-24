const express = require('express');
const { url } = require('inspector');
const app = express();
const port = 9000;
const path = require('path');
let key = '';

// https://nodejs.org/docs/latest/api/process.html#processargv
const { argv } = require('node:process');

// https://nodejs.org/en/learn/manipulating-files/reading-files-with-nodejs
// Read in a key file that contains the API key. Prevents exposure of API key.
let apiKeyPath = argv[2];
let favoritesPath = path.join(__dirname, '\\public\\', '\\favorites\\', 'favorites.csv');
let documentPath = path.join(__dirname, '\\documentation\\', '\\README.pdf\\');

// https://nodejs.org/en/learn/manipulating-files/reading-files-with-nodejs
const fileStream = require('node:fs');
const { error } = require('console');
const readLine = require('readline');

fileStream.readFile(apiKeyPath, 'utf-8', (error, fileData) => {

    if (error) {

        console.log(`Problem reading API key from file: ${apiKeyPath}`);
        return;

    }

    key = fileData;

});

let favoriteLocations = {};
let history = [];

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// https://stackoverflow.com/questions/37991995/passing-a-variable-from-node-js-to-html
app.engine('html', require('ejs').renderFile);

let pubDirectory = path.join(__dirname, 'public');

async function getWeatherData(url) {

    /*

    Calls the Weather API using the provided url. The url
    parameter must contain the API key and the parameter(s)
    needed for a specific call.

    */

    const response = await fetch(url);
    const weatherResult = await response.json();

    if (weatherResult.hasOwnProperty('error')) {

        let errorCode = weatherResult['error']['code'];
        let errorMessage = weatherResult['error']['message'];
        result = {

            errorCode: errorCode,
            errorMessage: errorMessage

        };
        return result;
    }

    else {

        let city = weatherResult['location']['name'];
        let state = weatherResult['location']['region'];
        let country = weatherResult['location']['country'];
        let latitude = weatherResult['location']['lat'];
        let longitude = weatherResult['location']['lon'];
        let timeZone = weatherResult['location']['tz_id'];
        let localTime = weatherResult['location']['localtime'];
        let fahrenheit = weatherResult['current']['temp_f'];
        let feelsLikeFahrenheit = weatherResult['current']['feelslike_f'];
        let visibility = weatherResult['current']['vis_miles'];
        let wind_mph = weatherResult['current']['wind_mph'];
        let windDirection = weatherResult['current']['wind_dir'];
        let timeOfDay = weatherResult['current']['is_day'];
        timeOfDay == 0 ? timeOfDay = 'Nighttime' : timeOfDay = 'Daytime';
        let weatherSummary = weatherResult['current']['condition']['text'];
        let weatherPicture = weatherResult['current']['condition']['icon'];

        let result = {
            city: city,
            state: state,
            country: country,
            latitude: latitude,
            longitude: longitude,
            timeZone: timeZone,
            localTime: localTime,
            fahrenheit: fahrenheit,
            feelsLikeFahrenheit: feelsLikeFahrenheit,
            visibility: visibility,
            wind_mph: wind_mph,
            windDirection: windDirection,
            timeOfDay: timeOfDay,
            weatherSummary: weatherSummary,
            weatherPicture: weatherPicture

        }

        return result;

    }

}

function updateHistory() {

    /*

    Checks the search history
    and removes older entries to make
    way for the new ones.

    */

    let lastIndex = history.length - 1;

    if (lastIndex <= 0) {

        let lastLocation = history[0];

        let historyData = {

            lastLocation: lastLocation,
        }

        return historyData;
    }

    else if (lastIndex == 1) {

        let lastLocation = history[0];
        let secondLastLocation = history[1];

        let historyData = {

            lastLocation: lastLocation,
            secondLastLocation: secondLastLocation,
        }

        return historyData;


    }

    else {

        let lastLocation = history[lastIndex];
        let secondLastLocation = history[lastIndex - 1];
        let thirdLastLocation = history[lastIndex - 2];

        let historyData = {

            lastLocation: lastLocation,
            secondLastLocation: secondLastLocation,
            thirdLastLocation: thirdLastLocation,

        };

        return historyData;


    }

}

function clearFavorite(favoriteLocations) {

    /*

    Clears all contents of the favorites file.

    */


    // We want to clear all favorites first. Then after that, we write the locations we are keeping
    // back into the file.

    let favoritesData = ''
    fileStream.writeFile(favoritesPath, favoritesData, { flag: 'w' }, (error) => {

        if (error) {

            console.log(`ERROR: Cannot clear favorites file data. Error Reason: ${error}`);
        }

    });

    for (item in favoriteLocations) {

        let state = item
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach



        let stateFavorites = favoriteLocations[item];
        let counter = 0;
        stateFavorites.forEach((city) => {

            let favoritesData = String(city) + ',' + String(state) + '\n';

            fileStream.appendFile(favoritesPath, favoritesData, (error) => {

                if (error) {

                    console.log(`ERROR: Cannot write favorite record to storage. Error Reason: ${error}`);
                }

            });


        });


    }

}

app.get('/', (req, res) => {

    res.sendFile(path.join(__dirname, '\\public\\', '\\html\\', 'index.html'));

});

app.get('/getHistory', (req, res) => {

    res.send(updateHistory());

});

app.get('/getFavorites', (req, res) => {

    let favorites = {};

    // https://www.codingninjas.com/studio/library/how-to-read-csv-file-in-javascript
    fileStream.readFile(favoritesPath, 'utf-8', (error, data) => {

        if (error) {

            console.log(`Error reading favorites.csv`);
        }

        let csvLines = data.split('\n');
        csvLines.forEach((line) => {

            let csvFields = line.split(',');
            let city = csvFields[0];
            let state = csvFields[1];

            if (state != undefined && city != undefined && state != '' && city != '' && state != 'undefined' && city != 'undefined') {

                state = state.includes(' ') ? state.replace(' ', '_') : state;

                if (state in favorites) {

                    favorites[state].push(city);

                }

                else {

                    favorites[state] = [];
                    favorites[state].push(city);

                }

            }


        });

        favoriteLocations = favorites;
        return res.send(favorites);


    });

});

app.post('/removeFavorite', (req, res) => {

    let favorite = req.body;
    let removeCity = favorite['city'];
    let removeState = favorite['state'];

    for (item in favoriteLocations) {

        let state = item
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach

        if (removeState == state) {

            let stateFavorites = favoriteLocations[item];
            let counter = 0;
            stateFavorites.forEach((city) => {

                if (removeCity == city) {

                    delete favoriteLocations[state][counter];
                    counter++;
                }

                else {

                    counter++;
                }

            });
        }

    }


    clearFavorite(favoriteLocations);

    return res.sendStatus(200);

});

app.post('/addToFavorites', (req, res) => {

    let favorite = req.body;
    let zip_code = favorite['zipCode'];
    let city = favorite['city'];
    let state = favorite['state'];

    // https://stackoverflow.com/questions/49982058/how-to-call-an-async-function
    // https://stackoverflow.com/questions/69292467/getting-and-passing-object-to-node-js-render-method

    // Represents a single entry in the favorites.csv file.
    let favoritesData = String(city) + ',' + String(state) + '\n';

    fileStream.appendFile(favoritesPath, favoritesData, (error) => {

        if (error) {

            console.log(`ERROR: Cannot write favorite record to storage. Error Reason: ${error}`);
        }

    });

});

app.get('/documentation', (req, res) => {

    res.sendFile(documentPath);
    return;
})



app.post('/weatherInformation', (req, res) => {

    let locationInformation = req.body;
    let zip_code = locationInformation['zipCode'];
    zip_code == 'undefined' || zip_code == undefined ? zip_code = "" : zip_code = zip_code;
    let city = locationInformation['city'];
    let state = locationInformation['state'];
    let weatherUrl = ``

    // user provides all input fields.
    if ((zip_code != "") && (city != "") && (state != "")) {

        weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${zip_code}&aqi=no`;

    }

    // user provides only zip code.
    else if ((zip_code != "") && ((city == "") && (state == ""))) {

        weatherUrl = weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${zip_code}&aqi=no`;
    }

    // user provides city and state but not zip.
    else if ((zip_code == "") && (city != "" && state != "")) {

        weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${city}&q=${state}&aqi=no`;
    }

    else if ((zip_code == "") && (city == "" || state == "")) {

        weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${key}&q=${zip_code}&aqi=no`;
    }


    // https://stackoverflow.com/questions/49982058/how-to-call-an-async-function
    let result = getWeatherData(weatherUrl).then(

        (result) => {

            if (result.hasOwnProperty('errorCode')) {

                res.render(`${pubDirectory}/html/errorResult.html`, { result: result });
                

            }

            else {

                history.push([result.city, result.state]);
                updateHistory();
                res.render(`${pubDirectory}/html/weatherResult.html`, { result: result })
            }
        });

});

app.listen(port, () => {

    console.log(`Listening on port: ${port}.`);

});

/*
    Attributions:

    “Your Career in Web Development Starts Here.” Your Career in Web Development Starts Here | The Odin Project, The Odin Project, www.theodinproject.com/. Accessed 24 Jan. 2024.
    “1.4: JSON - Working with Data and Apis in JavaScript.” YouTube, The Coding Train, 25 May 2019, www.youtube.com/watch?v=uxf0--uiX0I. 

    https://developer.mozilla.org/en-US/docs/Web/API/Response/status
    https://expressjs.com/en/starter/installing.html
    https://expressjs.com/en/starter/hello-world.html
    https://www.youtube.com/watch?v=OgXqtxF0BO8
    https://www.youtube.com/watch?v=7UErZ43jzrU
    https://www.youtube.com/watch?v=1YscOTfgAI4
    https://www.youtube.com/watch?v=mW2NyglYpm8
    https://www.youtube.com/watch?v=fyc-4YmgLu0
    https://www.youtube.com/watch?v=C_vv1D5oDZ0
    https://www.youtube.com/watch?v=PbfjNTsHfaU
    https://stackoverflow.com/questions/69212019/error-in-postman-req-body-is-not-a-function
    https://www.youtube.com/watch?v=-qkU95vNqTo
    https://www.youtube.com/watch?v=vegqqDjulKg
    https://www.weatherapi.com/api-explorer.aspx
    https://stackoverflow.com/questions/24330014/bodyparser-is-deprecated-express-4
    https://stackoverflow.com/questions/49982058/how-to-call-an-async-function
    https://www.youtube.com/watch?v=Lj7vHt9uJgw
    https://www.npmjs.com/package/ejs
    https://stackoverflow.com/questions/37991995/passing-a-variable-from-node-js-to-html
    https://www.merriam-webster.com/dictionary/nighttime#:~:text=%E2%80%9CNighttime.%E2%80%9D%20Merriam%2DWebster,.com%2Fdictionary%2Fnighttime.
    https://www.quora.com/What-is-the-difference-between-day-time-and-daytime#:~:text=The%20main%20difference%20between%20the,and%20it%20is%20light%20outside.
    https://www.swc.nd.gov/arb/news/atmospheric_reservoir/pdfs/2015_05%20-%20Fahrenheit%20vs%20Celsius.pdf
    https://www.weatherapi.com/docs/
    https://nodejs.org/docs/latest/api/process.html#processargv
    https://nodejs.org/en/learn/manipulating-files/reading-files-with-nodejs
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch
    https://stackoverflow.com/questions/69292467/getting-and-passing-object-to-node-js-render-method
    https://nodejs.org/en/learn/manipulating-files/writing-files-with-nodejs
    https://stackoverflow.com/questions/74307284/how-to-serve-images-as-static-files-using-url-parameters-in-express-js
    https://docs.github.com/en/authentication/connecting-to-github-with-ssh/working-with-ssh-key-passphrases
    https://superuser.com/questions/1010542/how-to-make-git-not-prompt-for-passphrase-for-ssh-key
    
    “How Can I Undo the Last Commit?” Learn Version Control with Git, Tower, www.git-tower.com/learn/git/faq/undo-last-commit. Accessed 20 Jan. 2024. 

    “Working with SSH Key Passphrases.” GitHub Docs, GitHub, docs.github.com/en/authentication/connecting-to-github-with-ssh/working-with-ssh-key-passphrases. Accessed 24 Jan. 2024.

    https://stackoverflow.com/questions/10032461/git-keeps-asking-me-for-my-ssh-key-passphrase

    https://firstlogic.com/insights/zip-plus-four-codes

    https://pe.usps.com/archive/html/dmmarchive20030810/A010.htm#:~:text=The%20most%20complete%20ZIP%20Code,a%20hyphen%2C%20and%20four%20digits.

    https://app.diagrams.net/

*/