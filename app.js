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
const databaseUrl = "mongodb://127.0.0.1:27017/Node_Auth";
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'chasecompskjsce@gmail.com',
    pass: 'rahil_loves_sex'
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
    text: 'click on the link and start using peerpad: ' + link,
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

// app.post('/registerUser', function(req, res, next) {
//   if (
//     req.body.username &&

//     req.body.password &&
//     req.body.confirmPassword) {

//       // confirm that user typed same password twice
//       if (req.body.password !== req.body.confirmPassword) {
//         var err = new Error('Passwords do not match.');
//         err.status = 400;
//         return next(err);
//       }

//       // create object with form input
//       var userData = {
//         // email: req.body.email,
//         username: req.body.username,
//         // favoriteBook: req.body.favoriteBook,
//         password: req.body.password
//       };
// 	console.log(req.body.username)
// 	console.log(req.body.password)
//       // use schema's `create` method to insert document into Mongo
// 	  User().save().then((user) => {
// 		  req.session.userId = user._id;
//         res.render("login", { title: "RANDOM" });
//       })

//     //   User.create(userData, function (error, user) {
//     //     if (error) {
//     //       return next(error);
//     //     } else {
//     //       req.session.userId = user._id;
//     //       return res.redirect('/profile');
//     //     }
//     //   });

//     } else {
//       var err = new Error('All fields required.');
//       err.status = 400;
//       return next(err);
//     }
// })

app.post("/registerUser", function (req, res) {
  console.log(req.body);
  bycrypt.hash(req.body.password, 10, function (err, hashedPass) { //2 times SMHHHHHH
    if (err) {
      res.json({
        error: err,
      });
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
        res.json({
          message: "Error Occured",
        });
      });
  });
});

// app.post('/loginUser', function (req, res) {
// 	console.log(req.body);
// 	var name = req.body.name;
//     var password = req.body.password;

//     User.findOne({$or: [{name:name}, {password: password}]})
//     .then(user=>{
//         if(user){
//             bycrypt.compare(password, user.password, function(err, result){
//                 if(err){
//                     res.json({
//                         error: err
//                     })
//                 }
//                 if(result){
//                     let token = jwt.sign({name: user.username}, 'very_secret_key', {expiresIn: '100s'})
// 					res.render('new')
// 					// res.json({
//                     //     message: "Login Successful",
//                     //     token
//                     // }) 
//                 }else{
//                     res.json({
//                         message: "Invalid Credentials"
//                     })
//                 }
//             })
//         }else{
//             res.json({
//                 message: "No user found"
//             })
//         }
//     })
// })

app.post('/loginUser', function (req, res, next) {
  if (req.body.email && req.body.password) {
    User.authenticate(req.body.email, req.body.password, function (error, user) {
      if (error || !user) {
        var err = new Error('Wrong email or password.');
        err.status = 401;
        return next(err);
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
    return next(err);
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

app.post('/join/:email', function (req, res) {
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

  x = 1
  if (x == 0) {
    res.redirect('/profile');
  }
  else {
    res.redirect('/' + docid + "?" + id)
  }

});

app.post('/add/:id', function (req, res) {
  console.log("EMAIL to be added=", req.body.email, req.params.id)
  if (id != undefined) {
    console.log("CHECK->", id)
    res.redirect('/' + "?" + id)    //to be changed
  }
  else {
    res.redirect('/')
  }

})

app.get("/:id", async function (req, res) {
  console.log("Here")
  console.log("QUERY=", req.params);
  console.log("QUERY=", req.query, typeof (req.body), Object.keys(req.query)[0])
  id = String(Object.keys(req.query)[0])
  let docId = req.params.id
  console.log("ID->", typeof (id))
  console.log("ID->", typeof (req.session.userEmail))
  if (id == "undefined") {
    console.log("id undefined")
  }
  if (req.session.userEmail == undefined) {
    console.log("email undefined")
  }
  console.log("count=", req.session.userEmail)
  if (req.session.userEmail == undefined) {
    res.redirect("/login")
  }
  else {
    if (id == "undefined") {
      res.render("peerpad", { title: "PeerPad" });
    }
    else {
      //check access using docid and userEmail here
      let docAccess = await DocAccess.findOne({
        documentId: docId,
        allowedEmails: { $elemMatch: { $eq: req.session.userEmail } }
      })
      x = 1
      if (docAccess) {     //the user has access to the doc
        res.render("peerpad", { title: "PeerPad", id: id });
      }
      else {         //user doesnt have access to the doc
        res.send("Your dont have access to the doc")
      }
    }
  }

});

app.get("/", function (req, res) {
  res.render("peerpad", { title: "PeerPad" });

});

app.get('*', function (req, res) {
  res.send('404 not found');
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
