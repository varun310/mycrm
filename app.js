/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();
/**
Packages and Authentications
**/
var http = require("http");
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: true });

// Nodejs encryption with CTR
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

var admin = require("firebase-admin");
var serviceAccount = require("./mycrm-d955f.json");



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mycrm-d955f.firebaseio.com"
});


function encrypt(text) {
 let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
 let encrypted = cipher.update(text);
 encrypted = Buffer.concat([encrypted, cipher.final()]);
 return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

function decrypt(text) {
 let iv = Buffer.from(text.iv, 'hex');
 let encryptedText = Buffer.from(text.encryptedData, 'hex');
 let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
 let decrypted = decipher.update(encryptedText);
 decrypted = Buffer.concat([decrypted, decipher.final()]);
 return decrypted.toString();
}



var db = admin.firestore();
var db = admin.firestore();
var docRef = db.collection('contacts');
var userRef = db.collection('users');
var noteRef = db.collection('notes');


/**
LIST USERS API
**/

app.get('/listUsers',/* @callback */ function (req, res) {
	
	var d1 = req.query.contact;
   var contactRef = docRef.doc(d1);
	var getDoc = contactRef.get()
  .then(doc => {
    if (!doc.exists) {
		var e1 = "No such Document :: " +d1;
      res.status(404).send(e1);
    } else {
		console.log(doc.data());
      res.send(doc.data());
    }
  })
  .catch(err => {
    console.log('Error getting document', err);
	res.status(500).send('Error getting document');
  }); 
});


/** CREATE USER **/

app.post('/createContact', urlencodedParser, function (req, res){
	
	 
	var c1 =  req.body.contactno;
	var tstamp = Date.now();
	//var pass = encrypt(req.body.password);
	var setAda = {
  
		address: req.body.address,
		available: req.body.avl,
		bio: req.body.bio,
		designation: req.body.designation,
		dob: req.body.dob,
		email: req.body.email,
		name: req.body.name,
		organization: req.body.org,
		/**password: {
		  iv:pass.iv,
		  encryptedData:pass.encryptedData
		},**/
		password: req.body.password,
		stamp: tstamp,
		phone: req.body.mobile,
		phone2: req.body.landline,
		location: {"_latitude":req.body.latitude,"_longitude":req.body.longitude}
	  
	};
	docRef.doc(c1).set(setAda);
	res.send(setAda);
 });

 /** Login USER **/
app.post('/authUser', urlencodedParser, function (req, res){
	
	
	var user = req.body.user;
	var passinput = req.body.pass;
	//var pass = encrypt(passinput);
	
	if(user == '' || user == null || pass == '' || pass == null){
	console.log('No Data');
	res.status(404).send('No Data');
	}
	else{
	var queryRef = userRef.where('email','==',user).where('password','==',pass).get();

	var searchData = {};
	queryRef.then((snapshot) => {
		snapshot.forEach((doc) => {
			searchData[doc.id] = doc.data();
			if(decrypt(doc.data().password) == passinput){
				res.send("true");
			}
			else{
				res.send("false")
			}
		});
	
  })
  .catch((err) => {
    console.log('Error getting documents', err);
  });
}
 });
 
 /** SEARCH **/
app.post('/search', urlencodedParser, function (req, res){

// Create a query against the collection
//var dbfield1 = req.body.field1;
var designation = req.body.designation;
var organization = req.body.organization;
var address = req.body.address;
var queryRef = null;

if(designation && organization && address){
	queryRef = docRef.where('designation','==',designation).where('organization','==',organization).where('address','==',address).where('available','==',"true").get();
}
else if(designation && organization){
	queryRef = docRef.where('designation','==',designation).where('organization','==',organization).where('available','==',"true").get();
}
else if(designation && address){
	queryRef = docRef.where('designation','==',designation).where('address','==',address).where('available','==',"true").get();
}
else if(organization && address){
	queryRef = docRef.where('organization','==',organization).where('address','==',address).where('available','==',"true").get();
}
else if(designation){
	queryRef = docRef.where('designation','==',designation).where('available','==',"true").get();
}
else if(organization){
	queryRef = docRef.where('organization','==',organization).where('available','==',"true").get();
}
else if(address){
	queryRef = docRef.where('address','==',address).where('available','==',"true").get();
}
else{
	queryRef = docRef.where('available','==',"true").get();
}
	var searchData = {};
queryRef.then((snapshot) => {
    snapshot.forEach((doc) => {
		var x = doc.id;
		searchData[x] = doc.data();
      console.log(x, '=>', doc.data());
    });
	res.send(searchData);
  })
  .catch((err) => {
    console.log('Error getting documents', err);
  });
});


// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
	
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
