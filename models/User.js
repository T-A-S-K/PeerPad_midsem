const mongoose = require('mongoose');
const Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
const userSchema = new Schema({
    email:{
        type: String
    },
    password:{
        type: String
    }
}, {timestamps: true});


// authenticate input against database documents
userSchema.statics.authenticate = function(email, password, callback) {
  User.findOne({ email: email })
      .exec(function (error, user) {
        if (error) {
          return callback(error);
        } else if ( !user ) {
          var err = new Error('User not found.');
          err.status = 401;
          return callback(err);
        }
        console.log("CHECK->",user.email,user.password.length,password)
        bcrypt.compare(password, user.password , function(error, result) {
          if (result === true) {
              console.log('IT WORKS')
            return callback(null, user);
          } else {
              console.log('DOENT WORK') 
            return callback();
          }
        })
        // bcrypt.hash(password, 10, function(err, result) {
        //     console.log("result") plain password
        //     console.log(result)
        //     console.log(password)
            
        // })
        console.log(user.password)
        console.log(password)
        
      });
}
// hash password before saving to database
// userSchema.pre('save', function(next) {
//   var user = this;
//   bcrypt.hash(user.password, 8, function(err, hash) {
//     if (err) {
//       return next(err);
//     }
//     console.log("HASH=",hash,hash.length)
//   // bcrypt.compare(user.password, hash , function(error, result) {
//   //         if (result === true) {
//   //             console.log('IT WORKS')
//   //           return callback(null, user);
//   //         } else {
//   //             console.log('DOENT WORK')
//   //           return callback();
//   //         }
//   //       })
//         user.password = hash;
//     next();
//   })
// });

const User = mongoose.model('User', userSchema);
module.exports = User;