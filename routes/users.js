const express = require('express');
const router = express.Router();
const { User } = require('../db/index').models;

const bcryptjs = require('bcryptjs');
const auth = require('basic-auth');

function asyncHandler(callback) {
    return async(req, res, next) => {
        try {
            await callback(req, res, next)
        } catch(error) {
            next(error)
        }
    }
}

const authenticateUser = async (req, res, next) => {
    let message = null;
  
    // Get the user's credentials from the Authorization header.
    const credentials = auth(req);
  
    if (credentials) {
      // Look for a user whose `username` matches the credentials `name` property.
      const user = await User.findOne({where: {emailAddress: credentials.name}});
  
      if (user) {
        const authenticated = bcryptjs
          .compareSync(credentials.pass, user.password);
        if (authenticated) {
          console.log(`Authentication successful for username: ${user.firstName} ${user.lastName}`);
  
          // Store the user on the Request object.
          req.currentUser = user;
        } else {
          message = `Authentication failure for username: ${user.firstName}`;
        }
      } else {
        message = `User not found for username: ${credentials.name}`;
      }
    } else {
      message = 'Auth header not found';
    }
  
    if (message) {
      console.warn(message);
      res.status(401).json({ message: 'Access Denied' });
    } else {
      next();
    }
  };


router.get('/users', authenticateUser, asyncHandler( async (req, res, next) => {
    console.log('hi', req.currentUser)
    const { firstName, lastName, emailAddress } = req.currentUser;
    
    res.json({
      firstName,
      lastName,
      emailAddress,
    });
}));

router.post('/users', asyncHandler( async (req, res, next) => {
    const user = req.body;

    if(user.password) {
        user.password = bcryptjs.hashSync(user.password)
    };

    try {
        await User.create(user);
        res.status(201).location('/').end();
    } catch (error) {
        if(error.name === 'SequelizeValidationError') {
            const errorMessage = [];

            error.errors.map( err => errorMessage.push(err.message));
            res.status(400).json({error: errorMessage})
        } else {
            next(error);
        }
    }
}))

module.exports = router;