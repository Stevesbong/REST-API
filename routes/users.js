const express = require('express');
const router = express.Router();
const { User } = require('../db/index').models;

// Validations and Encrypt password
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

// Returns the current auth user
router.get('/users', authenticateUser, asyncHandler( async (req, res, next) => {
    const { currentUser } = req;
    const user = await User.findByPk(currentUser.id, {
        attributes: {
            exclude: ['password', 'createdAt', 'updatedAt']
        }
    })

    res.status(200).json(user)
}));

// Route that creates a new user.
router.post('/users', asyncHandler( async (req, res, next) => {
    try {
        const user = req.body;

        // hash password with bcryptjs
        if(user.password) {
            user.password = bcryptjs.hashSync(user.password);
        };
        await User.create(user);

        // Set the status to 201 Created and end the response.
        res.status(201).location('/').end();
    } catch (error) {
        const errorMessage = [];

        // If sequelize validation error issue
        if(error.name === 'SequelizeValidationError') {
            error.errors.map( err => errorMessage.push(err.message));
            res.status(400).json({error: errorMessage});

        // If Email address is not unique
        } else if(error.name === 'SequelizeUniqueConstraintError') {
            error.errors.map( err => errorMessage.push(err.message))
            res.status(400).json({error: errorMessage});
        } else {
            next(error);
        }
    }
}))

module.exports = router;