const express = require("express");
const path = require("path");
const app = express();
const port = 3000;
var nodemailer = require('nodemailer');
const bodyParser = require("body-parser");
const http = require("http");
const mongoose = require("mongoose");
const User = require("./models/User");
const bycrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var session = require('express-session');
var mid = require('./middleware')
var MongoStore = require('connect-mongo');
const DocAccess = require("./models/DocAccess");
const {user,pass} = require("./keys")
const databaseUrl = "mongodb://127.0.0.1:27017/Node_Auth";
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: user,
    pass: pass
  }
});


mongoose
  .connect(databaseUrl)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.log("Error has occurred while connecting to the database: ", err);
  });

app.use(session({
  secret: 'treehouse loves you',
  resave: true,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: "mongodb://localhost:27017/Node_Auth"
  })
}));

app.get("/index", function (req, res) {
  res.render("new", { title: "PeerPad" });
});

app.post("/sendEmail", async function (req, res) {
  console.log('WORKS ON SERVER');
  let email = req.body.email;

  let link = req.body.link;
  console.log(email);
  console.log(link)
  let docId = link.split('/')[link.split('/').length - 1].split('?')[0];
  console.log(docId)

  let docAccess = await DocAccess.findOne({
    documentId: docId
  })
  console.log(email)
  console.log(typeof (email))
  if (docAccess == null) {
    DocAccess.create({
      documentId: docId,
      ownerEmail: req.session.userEmail,
      allowedEmails: [email]
    })
  }
  else {
    console.log("INSIDEX ELSE")
    console.log(email);
    console.log(docId)
    await DocAccess.updateOne({ 'documentId': docId }, { $push: { 'allowedEmails': email } })
  }



  var mailOptions = {
    from: 'chasecompskjsce@gmail.com',
    to: email,
    subject: 'Peerpad document shared',
    text: 'Copy the link and paste it in the portal to join peerpad: ' + link,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
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

// app.get("/login", function (req, res) {
//   res.render("login", { title: "RANDOM" });
// });

app.get('/login', mid.loggedOut, function (req, res, next) {
  console.log('INSIDE LOGIN');
  return res.render('login', { title: 'Log In' });
});

// app.get("/register", function (req, res) {
//   res.render("register");
// });

app.get('/logout', function (req, res, next) {
  if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect('/login');
      }
    });
  }
});

app.get('/register', mid.loggedOut, function (req, res, next) {
  return res.render('register', { title: 'Sign Up' });
});

app.post("/registerUser", function (req, res) {
  console.log(req.body);
  bycrypt.hash(req.body.password, 10, function (err, hashedPass) { 
    if (err) {
      // res.json({
      //   error: err,
      // });
      res.render('error',{message:err});
    }
    let user = new User({
      email: req.body.email,
      password: hashedPass,
    });
    console.log("This is my pass: " + typeof hashedPass);
    user
      .save()
      .then((user) => {
        res.render("login", { title: "RANDOM" });
      })
      .catch((error) => {
        console.log(error)
        // res.json({
        //   message: "Error Occured",
        // });
        res.render('error',{message:error});
      });
  });
});

app.post('/loginUser', function (req, res, next) {
  if (req.body.email && req.body.password) {
    User.authenticate(req.body.email, req.body.password, function (error, user) {
      if (error || !user) {
        var err = new Error('Wrong email or password.');
        err.status = 401;
        // return next(err);
        res.render('error',{message:err});
      } else {
        console.log("SESSION")
        req.session.userId = user._id;
        req.session.userEmail = req.body.email
        // return res.redirect('/profile');
        res.render('profile', { title: 'PeerPad', email: req.body.email });
      }
    });
  } else {
    var err = new Error('Email and password are required.');
    err.status = 401;
    //return next(err);
    res.render('error',{message:err});
  }
});

app.get('/profile', mid.requiresLogin, function (req, res, next) {
  User.findById(req.session.userId)
    .exec(function (error, user) {
      if (error) {
        return next(error);
      } else {
        console.log('trying to render')
        return res.render('profile', { title: 'Profile', name: user.username, favorite: user.favoriteBook, url: '' });
      }
    });
});

app.post('/join/:email',async function (req, res) {
  console.log("REQQ==", req.body.doc, req.params.email)
  str = req.body.doc
  email = req.body.email || req.session.userEmail
  console.log(typeof (str), req.session.userEmail, email)
  docid = str.substring(0, str.indexOf('?'))
  console.log("->", docid)
  docid = docid.substring(docid.lastIndexOf('/') + 1)
  console.log("regex->", docid)
  id = str.substring(str.indexOf('?') + 1)

  //check the access using mail id and docid
      let docAccess = await DocAccess.findOne({
        documentId: docid,
        allowedEmails: { $elemMatch: { $eq: req.session.userEmail } }
      })
      console.log("DocAccess=",docAccess)
      if (docAccess) {     //the user has access to the doc
        res.redirect('/' + docid + "?" + id)
      }
      else {         //user doesnt have access to the doc
        res.render('error',{message:"You dont have access to this document"});
      }

});

// app.post('/add/:id', function (req, res) {
//   console.log("EMAIL to be added=", req.body.email, req.params.id)
//   if (id != undefined) {
//     console.log("CHECK->", id)
//     res.redirect('/' + "?" + id)    //to be changed
//   }
//   else {
//     res.redirect('/')
//   }

// })

app.get("/:id", async function (req, res) {
  console.log("Here")
  console.log("QUERY=", req.params);
  console.log("QUERY=", req.query, typeof (req.body), Object.keys(req.query)[0])
  id = String(Object.keys(req.query)[0])
  let docId = req.params.id
  console.log("ID->", typeof (id),id)
  console.log("ID->", typeof (req.session.userEmail))
  if (id == "undefined") {
    console.log("id undefined")
  }
  if (req.session.userEmail == undefined) {
    console.log("email undefined")
  }
  console.log("count=", req.session.userEmail)
  if (req.session.userEmail==undefined) {
    res.redirect("/login")
  }
  else {
    if (id == "undefined" && id=='') {
      res.render("peerpad", { title: "PeerPad" });
    }
    else {
      //check access using docid and userEmail here
      let docAccess = await DocAccess.findOne({
        documentId: docId,
        allowedEmails: { $elemMatch: { $eq: req.session.userEmail } }
      })
      console.log("DocAccess=",docAccess)
      if (docAccess) {     //the user has access to the doc
        res.render("peerpad", { title: "PeerPad", id: id });
      }
      else {         //user doesnt have access to the doc
       // res.send("Your dont have access to the doc")
        res.render('error',{message:"You dont have access to this document"});
      }
    }
  }

});

app.get("/", function (req, res) {
  if(req.session.userEmail==undefined){
    res.redirect("/login")
  }
  res.render("peerpad", { title: "PeerPad" });

});

app.get('*', function (req, res) {
  console.log("error")
  res.render('error',{message:"Page not found"});
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
