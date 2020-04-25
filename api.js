var express = require("express");
var bodyParser = require("body-parser");
var session = require('express-session');
var middle_session = require("./middlewares/session");
var invitacionRouter = require("./routers/invitacionRouter");
var cors = require('cors');
var mongoose = require('mongoose');
 // Use bluebird
mongoose.Promise = require('bluebird');
var Schema = mongoose.Schema;

function esperar_db(time, callback) {
    var stop = new Date().getTime();
    console.log("Esperando 3 segundos a la base de datos...");
    while(new Date().getTime() < stop + time) {
        ;
    }
    callback();
}
esperar_db(3000, function(){
	
	mongoose.connect(process.env.MONGODB_URI,{useMongoClient: true});
    
	 var api = express();
	 //Forest Admin Cors
     api.use('/invitaciones', cors({
  	 origin: [/\.forestadmin\.com$/,'https://perlayjorge.com',/\.node-wedding-api.herokuapp\.com$/],
     allowedHeaders: ['Authorization', 'X-Requested-With', 'Content-Type','Accept','Origin'],
     methods:'GET,PUT,POST,DELETE,OPTIONS,HEAD,PATCH',
     credentials: true
	 }));	
	
	//CORS middleware
	var allowCrossDomain = function(req, res, next) {
	    res.header('Access-Control-Allow-Origin', '*');
	    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

	    next();
	}

	api.use(bodyParser.json());
	api.use(bodyParser.urlencoded({extended:true}));
	api.use(session({
		secret : "comandas-db-ashley",
		resave : false,
		saveUninitialized : false
	}));
	api.use(allowCrossDomain);


	api.get("/", function(req, res){
		//res.send("Hola usuario: " + req.session.user_id);
	});

	//Invitaciones

	api.use("/invitaciones",invitacionRouter);
        //admin panel
        api.use(require('forest-express-mongoose').init({
 	 modelsDir:__dirname+'/models',
	 envSecret: process.env.FOREST_ENV_SECRET,
	 authSecret:process.env.FOREST_AUTH_SECRET,
         mongoose: require('mongoose'),
	}));


	api.listen(process.env.PORT || 3000);
	console.log("Aplicacion iniciada en el puerto: "+process.env.PORT);

});

