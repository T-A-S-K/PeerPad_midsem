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

app.post('/join', function (req, res) {
	console.log("REQQ==",req.body.doc)
	str=req.body.doc
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
	console.log("QUERY=",req.query)
	res.render('index', {title: 'PeerPad'});
});

var srv = app.listen(port, function() {
	console.log('Listening on '+port)
})

app.use('/peerjs', require('peer').ExpressPeerServer(srv, {
	debug: true
}))
