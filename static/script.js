function getLocation() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(doSomethingWithPosition);
    } else {
        console.log("Geo Location not supported by browser");
    }
}

function generateGoogleMapsLink(longitude, latitude) {
    return `https://www.google.com/maps/place/${latitude},${longitude}`;
}

function generateATag(text, link) {
    return `<a href="${link}">${text}</a>`
}

function doSomethingWithPosition(position) {
    var location = {
        longitude: position.coords.longitude,
        latitude: position.coords.latitude
    };

    window.longitude = position.coords.longitude;
    window.latitude = position.coords.latitude;

    let longitude = document.getElementById('longitude');
    let latitude = document.getElementById('latitude');
    let googleMaps = document.getElementById('google-maps');

    longitude.innerHTML = position.coords.longitude;
    latitude.innerHTML = position.coords.latitude;
    googleMaps.innerHTML = generateATag("link", generateGoogleMapsLink(position.coords.longitude, position.coords.latitude));


    console.log(location)
}

function hideSecretCode(code) {
    document.getElementById('secretCodePrompt').innerHTML = '<p>Paired with phone!</p>';
    document.getElementById('giantCode').innerHTML = '';
}

function showSecretCode(code) {
    function generateHTML () {
        return `<p>Hello, please text <a href="sms://+18509888804">+1 (850) 988-8804</a> with the code ${localStorage.getItem('secretCode')}</p>`
    }
    document.getElementById('secretCodePrompt').innerHTML = generateHTML();
    document.getElementById('giantCode').innerHTML = code;
}

function askServerForNewSession() {
    fetch('/web/create_session',
        {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                longitude: window.longitude,
                latitude: window.latitude
            })
        }).then(function(response) {
        return response.json();
    }).then(function(data) {
        jsonData = data;
        window.sessionId = jsonData.sessionId;
        window.secretCode = jsonData.secretCode;
        localStorage.setItem('sessionId', jsonData.sessionId);
        localStorage.setItem('secretCode', jsonData.secretCode);
        showSecretCode(jsonData.secretCode);
    });
}

function askServerForStatus() {
    fetch('/web/status', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId: window.sessionId
        })
    }).then(function(response) {
        return response.json();
    }).then(function(data) {
        if (data.pairedWithPhoneNumber) {
            window.authenticated = true;
            hideSecretCode();
            updateLocationWithServer();
        }
    })
}

function updateLocationWithServer() {
    fetch('/web/update/location/gps', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sessionId: window.sessionId,
            longitude: window.longitude,
            latitude: window.latitude
        })
    });
}

function main() {
    // Get location
    getLocation();
    // Check if restoring from previous session
    window.sessionId = localStorage.getItem('sessionId');
    window.authenticated = true;
    if (window.sessionId == null) { // new session required because none stored
        askServerForNewSession();
        window.authenticated = false;
    } else {
        fetch('/web/status', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: window.sessionId
            })
        }).then(function (response) {
            return response.json();
        }).then(function(jsonData) {
            if (!jsonData.valid) {
                askServerForNewSession();
            }
        })
    }
    // Check if phone has authenticated
    setInterval(function() {
        if (!window.authenticated) {
            askServerForStatus()
        }
    }, 3000);
    // Upload location every 10s
    setInterval(function() {
        if (window.authenticated) {
            updateLocationWithServer();
        }
    }, 2000);
}

main();
