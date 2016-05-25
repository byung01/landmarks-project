/******************************************************************************/
/* COMP 20 Assignment 3: Nodejs and mongodb                                   */
/*                                                                            */
/* Name: Bill Yung                                                            */
/* Date: April 13, 2016                                                       */
/******************************************************************************/

// Initialization
var express = require('express');

var bodyParser = require('body-parser'); // Required if we need to use HTTP query or post parameters
var validator = require('validator'); // See documentation at https://github.com/chriso/validator.js
var app = express();
// See https://stackoverflow.com/questions/5710358/how-to-get-post-query-in-express-node-js
app.use(bodyParser.json());
// See https://stackoverflow.com/questions/25471856/express-throws-error-as-body-parser-deprecated-undefined-extended
app.use(bodyParser.urlencoded({ extended: true })); // Required if we need to use HTTP query or post parameters

// Mongo initialization and connect to database
// process.env.MONGOLAB_URI is the environment variable on Heroku for the MongoLab add-on
// process.env.MONGOHQ_URL is the environment variable on Heroku for the MongoHQ add-on
// If environment variables not found, fall back to mongodb://localhost/nodemongoexample
// nodemongoexample is the name of the database
// var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://damp-cavers-33384.herokuapp.com';
var MongoClient = require('mongodb').MongoClient;
var db = MongoClient.connect("mongodb://heroku_pdw60cz4:8s8t9urqjelbiutf8g469qgn2f@ds023000.mlab.com:23000/heroku_pdw60cz4", function (error, databaseConnection) {
    db = databaseConnection;
});

var url = require('url');

// Looks for all static pages within public
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
    response.set('Content-Type', 'text/html');
    var index_page = '';

    /* Sorting the collection of checkins in descending order */
    db.collection('checkins').find().sort({"created_at":-1}).toArray(function (error, people) {
        if ( !error ) {
            index_page += "<!DOCTYPE HTML><html><head><title>Server for Historic Landmarks!</title></head><body><h1>People Logins</h1>";
            /* Creating a log for all the users who checked-in on the server */
            for (var i = 0; i < people.length; i++) {
                index_page += "<p>" + people[i].login + " checked in at " + people[i].lng + ", " + people[i].lat + " on " + people[i].created_at + ".</p>";
            }
            index_page += "</body></html>";
            response.send(index_page);
        }
        else {
            /* Send an error page */
            response.send('<!DOCTYPE HTML><html><head><title>Server for Historic Landmarks!</title></head><body><h1>People Logins</h1><p>Whoops, something went terribly wrong!</p><</body></html>');
        }
    });
});

app.post('/sendLocation', function (request, response) {

    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    var login = request.body.login;
    var lat = parseFloat(request.body.lat);
    var lng = parseFloat(request.body.lng);
    var time = new Date;

    var toInsert = {
        "login" : login,
        "lat" : lat,
        "lng" : lng,
        "created_at" : time
    };

    var data = { };

    /* 
     *  Database will not be accessed unless 
     *  the user sent the correct credentials
     */
    if (login && lat && lng) {
        db.collection('checkins').insert(toInsert, function (error, saved) {
            if ( !error) {
                db.collection('checkins').find().toArray(function (error, people) {
                    if ( !error ) {
                        db.collection('landmarks').createIndex({'geometry':"2dsphere"}, function (error, success) {
                            if ( !error ) {
                                db.collection('landmarks').find({geometry:{$near:{$geometry:{type:"Point",coordinates:[lng,lat]},$minDistance: 1000,$maxDistance: 1500}}}).toArray(function (error, landmarks) {
                                    if ( !error ) {
                                        /* 
                                         *  Extracting both the logins and the 
                                         *  landmarks within a one mile radius 
                                         */
                                        data = {"people":people, "landmarks":landmarks};
                                        response.send(data);
                                    }
                                    else {
                                        response.sendStatus(500);
                                    }
                                });
                            }
                            else {
                                response.sendStatus(500);
                            }
                        });
                    }
                    else {
                        response.sendStatus(500);
                    }
                });
            }
            else {
                response.sendStatus(500);
            }
        });
    }
    else {
        /* Send an error message if credentials are not correct */
        data = {"error":"Whoops, something is wrong with your data!"};
        response.send(data);
    }
});

/* Send a static html page with this URL extension */
app.get('/lab8', function (request, response) {
    response.sendfile(__dirname + '/public/trees.html');
});

app.get('/checkins.json', function (request, response) {
    var login = request.query.login;

    /* Retrieves the information of login passed in through a query string */
    db.collection('checkins').find({"login":login}).toArray(function (error, people) {
        if ( !error ) {
            response.send(people);
        }
        else {
            response.sendStatus(500);
        }
    });
});

app.listen(process.env.PORT || 5000);
