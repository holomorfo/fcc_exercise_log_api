const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://holomorfo:2holomorfo@ds119113.mlab.com:19113/fccholomorfo')

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())



app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
// app.use((req, res, next) => {
//   return next({status: 404, message: 'not found'})
// })

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

var Schema = mongoose.Schema;

var UserSchema = new Schema({
  username: String,
  age: Number,
  exerciseList: [{
    description: String,
    duration: Number,
    date: { type: Date, default: Date.now }
  }]
}, {
    usePushEach: true
  });

var User = mongoose.model('user', UserSchema);

// API

// Create user
//  UserId
//  Excercise List
//  Description
//  Duration
//  Date
//  Excercise list log
//,exerciseList: [{description: "Correr",duration: 50}] 
var createAndSavePerson = function (userName, done) {
  var person = new User({ username: userName });
  person.save(function (err, data) {
    if (err) return "Error";
    console.log("Saved!");
    done(data);
  });
};


app.post('/api/exercise/new-user', function (req, res, next) {
  let username = req.body.username;
  console.log("API");
  // Check if name not already taken
  User.find({ username: username }).exec((err, data) => {
    if (data.length > 0) {
      res.send("username already taken");
    } else {
      createAndSavePerson(req.body.username, (data) => {
        res.json({ username: username, _id: data._id });
      });
    };
  });

});





// Get Users list of one user
// GET users's exercise log: GET /api/exercise/log?{userId}[&from][&to][&limit]
// { } = required, [ ] = optional
// from, to = dates (yyyy-mm-dd); limit = number
// https://understood-texture.glitch.me/api/exercise/log?userId=Alisa&from=50&to=199&limit=20
app.get("/api/exercise/log", function (req, res) {
  let qr = req.query
  let id = qr.userId, from = qr.from, to = qr.to, limit = qr.limit;
  if (id == null) {
    res.send("Need user id");
    //res.sendStatus(404);
  } else {
    from = from == null ? new Date("1971-01-01") : new Date(from);
    to = to == null ? new Date() : new Date(to);
    from = from.getTime();
    to = to.getTime();
    limit = limit == null ? 10000 : parseFloat(limit);
    User.find({ _id: id }).exec((err, data) => {
      //console.log(data[0].exerciseList.slice(0,limit));
      console.log(data);

      let exList = data[0].exerciseList.slice(0, limit).map(elem => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return {
          description: elem.description,
          duration: elem.duration,
          date: elem.date.toLocaleDateString('en-EN', options)
        }
      })
      .filter(elem=>{
        let dt = new Date(elem.date);
        console.log("=========\nFrom "+from);
        console.log("Current "+dt.getTime());
        console.log("To "+to)
        return dt.getTime() > from && dt.getTime() < to;
      });

      
      let retObj = {
        _id: data[0]._id,
        username: data[0].username,
        count: data[0].__v,
        log: exList
      };
      res.json(retObj);
    });

  }
});


// ADD EXERCISE TO USER
mongoose.set('debug', true)
// Add exercise to user
// <input id="uid" type="text" name="userId" placeholder="userId*">
// <input id="desc" type="text" name="description" placeholder="description*">
// <input id="dur" type="text" name="duration" placeholder="duration* (mins.)">
// <input id="dat" type="text" name="date" placeholder="date (yyyy-mm-dd)">
var findAndUpdate = function (userId, desc, dur, date, done) {
  var ageToSet = 20;
  console.log("Enter find and update");
  User.findOneAndUpdate({ _id: userId }, { new: true }).exec((err, data) => {
    console.log("pushing " + data);
    data.exerciseList.push({ description: desc, duration: dur, date: date });
    console.log("pushing " + data);

    data.save((err, data) => {
      console.log("start saving " + data);
      if (err) console.log("Error " + err);
      //return data;
      console.log("No error");
      done(data);
    });

  });

};

app.post('/api/exercise/add', function (req, res, next) {
  console.log("API start");
  let userId = req.body.userId;       // required
  let descr = req.body.description;  // required
  let dur = req.body.duration;     // required
  let date = req.body.date;         // Optional
  console.log("before tests " + date);
  date = (date == "") ? new Date() : Date.parse(date) == NaN ? res.send("format error") : new Date(date);



  if (userId == "") res.send("unknown id");
  else if (descr == "") res.send("description required");
  else if (dur == "") res.send("duration required");
  else if (userId != null && descr != null && dur != null) {
    console.log("no data missing");

    console.log(userId + " " + descr + " " + dur + " " + date);
    //res.send(userId+" "+descr+" "+dur+" "+date);
    findAndUpdate(userId, descr, dur, date, data => {
      let dt = new Date(data.exerciseList[data.exerciseList.length - 1].date);
      var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      res.json({
        username: data.username,
        description: data.exerciseList[data.exerciseList.length - 1].description,
        duration: data.exerciseList[data.exerciseList.length - 1].duration,
        _id: data._id,
        date: dt.toLocaleDateString('en-EN', options)
      })
    });
  }

});


// Get list of all users

app.get("/api/exercise/users", function (req, res) {
  User.find({}).select("_id username __v").exec((err, data) => {
    console.log(data);
    res.json(data);
  });
});


