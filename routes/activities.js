var Activity = require('../config/models/activity').activity
var Edition  = require('../config/models/activity').edition
var Event    = require('../config/models/event').event
var Role     = require('../config/models/user').role
var User     = require('../config/models/user').user
var Macros   = require('../config/models/macros')
var mongoose = require('mongoose')
var objId    = mongoose.Types.ObjectId


// Activities page
exports.index = function(req, res) {
  Activity.find().exec(gotActivities)
  console.log(req.session.user);
  function gotActivities(err, all) {
    res.render('activities', {
      'activities': all,
      'user'      : req.session.user
    })
  }
}

// Single activity page
exports.one = function(req, res) {
  Activity.findOne({'link': req.params.activity}).exec(gotActivity)

  function gotActivity(err, one) {
    if (!one) return res.redirect('/activities')
    res.render('activity', {
      'activity'  : one,
      'user'      : req.session.user
    })
  }
}

// Edit an activity
exports.edit = function(req, res) {
  Activity.findOne({'link': req.query.link}).exec(gotActivity)

  function gotActivity(err, theActivity) {
    if(!theActivity)
      return res.redirect('/activities')
    res.render('activities', {
      'activity' : theActivity,
      'user'     : req.session.user
    })
  }
}

// Add a new activity handle
exports.add = function(req, res) {

  //Create new activity and add it if is new or update it if we got the id
  new_activity = {
    'name'        : req.body.name,
    'link'        : encodeURIComponent(req.body.name.replace(/\s+/g, '')),
    'description' : req.body.description
  }

  if (req.query.id) {
    Activity.update({'_id': req.query.id}, new_activity).exec()
    //console.log("Sunt pe edit si updatez"+req.body.name);
  }
  else {
    new Activity(new_activity).save(function(err) {
      if (err) console.log('[ERR] Could not save activity.')
    })
    //console.log("adaug activitate noua.")
  }

  res.redirect('/activities')
}

// Add a new edition handle
exports.add_edition = function(req, res) {
  // Get dates and format them for js date object
  var start = req.body.start_date
  var start_date = new Date(start.substring(7,11), start.substring(3,5), start.substring(0,2))
  var end = req.body.end_date
  var end_date = new Date(end.substring(7,11), end.substring(3,5), end.substring(0,2))

  // Create edition object
  var newEdition = new Edition({
    'name'        : req.body.name,
    'link'        : encodeURIComponent(req.body.name.replace(/\s+/g, '')),
    'start'       : start_date,
    'end'         : end_date
  })

  // Add edition to activity object
  var find = {'link': req.params.activity}
  var update = {$push: {'edition': newEdition}}
  Activity.update(find, update).exec()

  res.redirect('/activities/' + req.params.activity)
}

// Add a new person to an edition
exports.add_role = function(req, res) {
  Activity.findOne({'link': req.params.activity}).exec(gotActivity)

  function gotActivity(err, one) {
    var role = new Role({
      'activityId' : one._id,
      'editionId'  : objId.fromString(req.body.edition),
      'role'       : req.body.role
    })

    // Add role to user jobs
    var query = {'google.name': req.body.name}
    var update = {$push: {'jobs': role}}
    User.update(query, update).exec()

    // Add user to edition
    var user = req.body.name + ':' + req.body.role
    var query = {'edition._id': objId.fromString(req.body.edition)}
    var update = {$addToSet: {'edition.$.people': user}}
    Activity.update(query, update).exec(function (err, count) {
      if (req.user)
        console.log('* ' + req.user.email + ' added ' + req.body.name + ' as ' +
          req.body.role + ' for edition: ' + req.body.edition)
    })

    res.redirect('/activities/' + req.params.activity + '/' + req.params.edition)
  }
}

// List info about one edition
exports.edition = function(req, res) {
  _self = {}
  Activity.findOne({'link': req.params.activity}).exec(gotActivity)

  function gotActivity(err, one) {
    _self.activity = one
    // Remove extra data
    _self.activity.editions = []

    one.edition.forEach(function(ed) {
      if (ed.link === req.params.edition)
        gotEdition(ed)
    })
  }

  function gotEdition(ed) {
    _self.edition = ed
    _self.users = {}

    var user_list = []
    // Reformat people list to be easily processed
    ed.people.forEach(function(peep) {
      name = peep.split(':')[0]
      role = peep.split(':')[1]

      user_list.push(name)

      _self.users[name] = {}
      _self.users[name]['role'] = role
      _self.users[name]['info'] = {}
    })

    var query = {'google.name': {$in: user_list}, 'google.email': /@rosedu.org$/}
    User.find(query).exec(gotUsers)
  }

  function gotUsers(err, users) {
    users.forEach(function(user) {
      _self.users[user.google.name]['info'] = user
    })

    var query = {'editionId': _self.edition._id}
    Event.find(query).exec(gotEvents)
  }

  function gotEvents(err, events) {
    _self.events = events

    res.render('edition', {
      'activity' : _self.activity,
      'edition'  : _self.edition,
      'events'   : _self.events,
      'users'    : _self.users,
      'user'     : req.session.user,
      'roles'    : Macros.EVENTS_ROLES
    })
  }
}