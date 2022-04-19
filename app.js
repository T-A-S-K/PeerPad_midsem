const express = require("express");
const path = require("path");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
const http = require("http");
const mongoose = require("mongoose");
const User = require("./models/User");
const bycrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const databaseUrl = "mongodb://127.0.0.1:27017/Peerpad";
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

mongoose
  .connect(databaseUrl)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.log("Error has occurred while connecting to the database: ", err);
  });

app.get("/index", function (req, res) {
  res.render("new", { title: "PeerPad" });
});

app.post("/join", function (req, res) {
  console.log("REQQ==", req.body.doc);
  str = req.body.doc;
  url = str.substring(str.indexOf("?") + 1);
  x = 1;
  if (x == 0) {
    res.render("new");
  } else {
    res.render("new", { status: url });
  }
});

app.get("/login", function (req, res) {
  res.render("login", { title: "RANDOM" });
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/registerUser", function (req, res) {
  console.log(req.body);
  bycrypt.hash(req.body.password, 10, function (err, hashedPass) {
    if (err) {
      res.json({
        error: err,
      });
    }
    let user = new User({
      username: req.body.username,
      password: hashedPass,
    });
    console.log("This is my pass: " + typeof hashedPass);
    user
      .save()
      .then((user) => {
        res.render("login", { title: "RANDOM" });
      })
      .catch((error) => {
        res.json({
          message: "Error Occured",
        });
      });
  });
});

app.post('/loginUser', function (req, res) {
	console.log(req.body);
	var name = req.body.name;
    var password = req.body.password;

    User.findOne({$or: [{name:name}, {password: password}]})
    .then(user=>{
        if(user){
            bycrypt.compare(password, user.password, function(err, result){
                if(err){
                    res.json({
                        error: err
                    })
                }
                if(result){
                    let token = jwt.sign({name: user.username}, 'very_secret_key', {expiresIn: '100s'})
					res.render('new')
					// res.json({
                    //     message: "Login Successful",
                    //     token
                    // }) 
                }else{
                    res.json({
                        message: "Invalid Credentials"
                    })
                }
            })
        }else{
            res.json({
                message: "No user found"
            })
        }
    })
})

app.get("/", function (req, res) {
  console.log("QUERY=", req.query);
  res.render("index", { title: "PeerPad" });
});

var srv = app.listen(port, function () {
  console.log("Listening on " + port);
});

app.use(
  "/peerjs",
  require("peer").ExpressPeerServer(srv, {
    debug: true,
  })
);
