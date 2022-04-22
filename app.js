const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');
const http = require('http');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.get('/index', function (req, res) {
  res.render('new', {title: 'PeerPad'});
});

app.get('/login', function (req, res) {
  res.render('login', {title: 'PeerPad'});
});

app.post('/logged', function (req, res) {
	console.log("EMAIL=",req.body.email)
  res.render('new', {title: 'PeerPad',email:req.body.email});
});

app.post('/add/:id', function (req, res) {
	console.log("EMAIL to be added=",req.body.email,req.params.id)
	// res.render('index',{status:"url"})
})

app.post('/join/:email', function (req, res) {
	console.log("REQQ==",req.body.doc,req.params.email)
	str=req.body.doc
	console.log(typeof(str))
	url=str.substring(str.indexOf('?') + 1)
	
	x=1
	if(x==0){
		res.render('new');
	}
	else{
		res.render('new',{status:url})
	}
	
});

app.get('/', function (req, res) {
	console.log("QUERY=",req.query,typeof(req.body),Object.keys(req.query)[0])
	id=String(Object.keys(req.query)[0])
	res.render('index', {title: 'PeerPad',id:id});
});

var srv = app.listen(port, function() {
	console.log('Listening on '+port)
})

app.use('/peerjs', require('peer').ExpressPeerServer(srv, {
	debug: true
}))
