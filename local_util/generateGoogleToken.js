"use strict";
require('env-yaml').config({path: process.cwd() + '/serverless.env-dev.yml'});

/* This is a small script to be used for intializing
   the Google configuration. Calling the "list events"
   function (or any google api) initiates the quickstart 
   process if it hasn't yet been completed*/
 
let getAuth = require('../opt/google/authorize');

getAuth()