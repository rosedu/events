// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var eventSchema = mongoose.Schema({
    name         : String,
    start        : Date,
    end          : Date,
    location     : String,
    email        : String,
    link         : String,
    description  : String,
    publisher    : String,
    membersOnly  : {type: Boolean, default: false},
    tags         : [String]
});

// create the model for users and expose it to our app
module.exports = mongoose.model('Event', eventSchema);
