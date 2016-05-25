/******************************************************************************/
/*                        Initializing Map and Variables                      */
/******************************************************************************/
var myLat = 42.4075;
var myLng = -71.1190;

var data;
var map;
var infoWindow = new google.maps.InfoWindow();

var HongKong = new google.maps.LatLng(22.2975, 114.1739);
var hi = new google.maps.LatLng(42.4075, -71.1190);
var myCoords = {
    zoom: 14,
    center: HongKong,
    mapTypeId: google.maps.MapTypeId.ROADMAP
};

/*
 *  Icon for the user
 */
var me_image = {
    url: 'dancing.png',
    size: new google.maps.Size(30, 30),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(10, 15)
};

/*
 *  Icon for people markers
 */
var ppl_image = {
    url: 'chick.png',
    size: new google.maps.Size(30, 30),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(10, 15)
};

/*
 *  Icon for landmark markers
 */
var lnd_image = {
    url: 'chicken.png',
    size: new google.maps.Size(30, 30),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(10, 15)
};

function init()
{
    map = new google.maps.Map(document.getElementById("map"), myCoords);
    getLocations();
}

/******************************************************************************/
/*               Functions defined here get locations for the map             */
/******************************************************************************/

function getLocations() 
{
    if (navigator.geolocation) { // supported on the browser
        navigator.geolocation.getCurrentPosition(function (position) {
            myLat = position.coords.latitude;
            myLng = position.coords.longitude;
            sendLocation();
        });
    }
    else {
        alert("Geolocation is not supported by your browser. What a shame!");
    }
}

function sendLocation() 
{
    var xhr = new XMLHttpRequest();
    var params = "login=Baoby&lat=" + myLat + "&lng=" + myLng;
    var url = "https://damp-caverns-33384.herokuapp.com/sendLocation";
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.onreadystatechange = function() {
        if(xhr.readyState == 4 && xhr.status == 200) {
            data = JSON.parse(xhr.responseText);
            renderMap();
        }
    }

    xhr.send(params);
}

/******************************************************************************/
/*                          Functions to render the map                       */
/******************************************************************************/

function renderMap()
{
    var me = new google.maps.LatLng(myLat, myLng);
    ppl = data.people;      // List of people around me
    lnd = data.landmarks;   // List of landmarks around me
    nearestIndex = findNearestLandmark(lnd);

    /* Setting all the markers on the map */
    setMarkers(ppl, createPeopleMarker); 
    setMarkers(lnd, createLandmarkMarker);
    setNearestLandmarkPath();

    /* Center the camera at the user's position */
    map.panTo(me); 
}

/*
 *  Takes in a list of landmarks
 *  Returns the index of the nearest landmark
 */
function findNearestLandmark(lnd) 
{
    var lat = lnd[0].geometry.coordinates[1];
    var lng = lnd[0].geometry.coordinates[0];
    var dist1 = findDistance(lat, lng);
    var nearest = 0;

    for (i = 1; i < lnd.length; i++) {
        lat = lnd[i].geometry.coordinates[1];
        lng = lnd[i].geometry.coordinates[0];
        var dist2 = findDistance(lat, lng);
        if (dist1 > dist2) {
            nearest = i;
            dist1 = dist2;
        }
    }

    return nearest;
}

/*
 *  Uses the Haversine Formula to calculate distances
 *  Between the user and people/landmarks
 */
function findDistance(lat, lng) 
{
    Number.prototype.toRad = function () {
        return this * Math.PI / 180;
    }

    /* Calculated in kilometers */
    var R = 6371;   // km
    var x1 = lat - myLat;
    var x2 = lng - myLng;
    var dLat = x1.toRad();
    var dLon = x2.toRad();

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(myLat.toRad()) * Math.cos(lat.toRad()) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;

    /* Converting to miles */
    var y1 = d / 2;
    var y2 = y1 / 4;
    d = y1 + y2;

    return d.toFixed(3);
}

/*
 *  Apply function to create people markers
 *
 *  Takes in an object within the people list
 *  Sets all the data passed in and creates a marker
 *  These markers will mark the people on the map
 *  Returns a people marker
 */
function createPeopleMarker(data) {
    var marker;

    if (data.lat === myLat && data.lng === myLng) {
        // var index = findNearestLandmark(lnd);
        var lat = lnd[nearestIndex].geometry.coordinates[1];
        var lng = lnd[nearestIndex].geometry.coordinates[0];
        var location_name = lnd[nearestIndex].properties.Location_Name;
        marker = new google.maps.Marker({
            icon: me_image,
            position: new google.maps.LatLng(myLat, myLng),
            animation: google.maps.Animation.BOUNCE,
            title: "<b>Login: </b>" + data.login +
                   "<BR><b>Latitude: </b>" + lat.toFixed(3) +
                   "<BR><b>Longitude: </b>" + lng.toFixed(3) +
                   "<BR><b>Nearest Landmark: </b>" + location_name +
                   "<BR><b>Miles Away: </b>" +  findDistance(lat, lng)
        });
    }
    else {
        var lat = data.lat;
        var lng = data.lng;
        marker = new google.maps.Marker({
            icon: ppl_image,
            position: new google.maps.LatLng(lat, lng),
            animation: google.maps.Animation.DROP,
            title: "<b>Login: </b>" + data.login + 
                   "<BR><b>Latitude: </b>" + lat.toFixed(3) +
                   "<BR><b>Longitude: </b>" + lng.toFixed(3) +
                   "<BR><b>Miles Away: </b>" + findDistance(lat, lng)
        });
    }

    return marker;
}

/*
 *  Apply function to createlandmark markers
 *
 *  Takes in an object within the landmarks list
 *  Sets all the data passed in and creates a marker
 *  These markers will mark the landmarks on the map
 *  Returns a landmark marker
 */
function createLandmarkMarker(data) {
    var lat = data.geometry.coordinates[1];
    var lng = data.geometry.coordinates[0];
    var marker = new google.maps.Marker({
        icon: lnd_image,
        position: new google.maps.LatLng(lat, lng),
        animation: google.maps.Animation.DROP,
        title: data.properties.Details
    });
    return marker;
}   

/*
 *  Mapping function to loop through a list of elements
 *
 *  Takes in a list and a function
 *  The function passed in will be applied to each element of the list
 *  The markers created will then be set on the map
 */
function setMarkers(list, func) {
    for (i = 0; i < list.length; i++) {
        var marker;                  // Variable to hold marker
        marker = func(list[i]);      // Creating the markers
        marker.setMap(map);          // Setting markers on the map

        // Adding event listeners for markers to show infoWindows
        google.maps.event.addListener(marker, 'click', function () {
                infoWindow.setContent(this.title);
                infoWindow.open(map, this);
        });
    }
}

/*
 * Creates a path that directs the user to the cloest Landmark
 */
function setNearestLandmarkPath() {
    var lat = lnd[nearestIndex].geometry.coordinates[1];
    var lng = lnd[nearestIndex].geometry.coordinates[0];
    var path = [{lat: myLat, lng: myLng},
                {lat: lat, lng: lng}];
    var LandmarkPath = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: "#000000",
        strokeOpacity: 1.0,
        strokeWeight: 5,
        title: "<b>" + findDistance(lat, lng) + " Miles</b>"
    });

    midLat = midPoint(myLat, lat);
    midLng = midPoint(myLng, lng);

    google.maps.event.addListener(LandmarkPath, 'click', function () {
        infoWindow.setContent(this.title);
        infoWindow.setPosition({lat: midLat, lng: midLng});
        infoWindow.open(map, this);
    });

    LandmarkPath.setMap(map);
}

function midPoint(x, y) {
    return (x + y) / 2;
}
