const express = require('express');
const router = express.Router();

// require two models
const { User, Course } = require('../db/index').models;

// Validations and Encrypt password
const auth = require('basic-auth');
const bcryptjs = require('bcryptjs');
const { check, validationResult } = require('express-validator');

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

// Return all courses.
router.get('/courses', asyncHandler( async (req, res, next) => {
    const courses = await Course.findAll({
        attributes: {
            exclude: ['createdAt', 'updatedAt']
        },
        include: {
            model: User,
            as: 'user',
            attributes: {
                exclude: ['password', 'createdAt', 'updatedAt']
            }
        }
    });
    res.status(200).json({courses})
}))

// Return single course.
router.get('/courses/:id', asyncHandler( async (req, res, next) => {
    const course = await Course.findByPk(req.params.id, {
        attributes: {
            exclude: ['createdAt', 'updatedAt']
        },
        include: {
            model: User,
            as: 'user'
        }
    })

    if (course) {
        res.status(200).json({course})
    } else {
        res.status(404).json({message:'Course Not Found.'})
    }
}));

// Create course.
router.post('/courses', authenticateUser, asyncHandler( async (req, res, next) => {
    try {
        const course = await Course.create(req.body);

        // Set the status to 201 Created and end the response.
        res.status(201).location('/').end();
    } catch (error) {
        const errorMessage = [];
        if(error.name === 'SequelizeValidationError') {
            // Use the Array `map()` method to get a list of error messages.
            error.errors.map( err => errorMessage.push(err.message));

            // Return the validation errors to the client.
            res.status(400).json({error: errorMessage})
        } else {
            next(error);
        }
    }
}));

// Edit course only owned by current user.
router.put('/courses/:id', [
    check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Title is not valid.'),
    check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Description is not valid.')
],  authenticateUser,
    asyncHandler( async (req, res, next) => {
        const { currentUser } = req;
        const course = await Course.findByPk(req.params.id);

        // Attempt to get the validation result from the Request object.
        const errors = validationResult(req);

        // If there are validation errors...
        if(!errors.isEmpty()) {
            // Use the Array `map()` method to get a list of error messages.
            const errorMessages = errors.array().map(error => error.msg);

            // Return the validation errors to the client.
            return res.status(400).json({message: errorMessages})
        }

        // If course exists.
        if(course) {
            if(course.userId === currentUser.id) {
                try {
                    await course.update(req.body);
                    res.status(204).end();
                } catch (error) {
                    const errorMessage = [];
                    // If sequelize validation error issue
                    if(error.name === 'SequelizeValidationError') {
                        // Use the Array `map()` method to get a list of error messages.
                        error.errors.map( err => errorMessage.push(err.message));

                        // Return the validation errors to the client.
                        res.status(400).json({error: errorMessage})
                    } else {
                        next(error);
                    }
                }
            } else {
                res.status(403).json({message: 'User is Not Authorized.'})
            }
        } else {
            res.status(404).json({message:'Course Not Found.'})
        }
}))

// Delete course only owned by current user.
router.delete('/courses/:id', authenticateUser, asyncHandler( async (req, res, next) => {
    const { currentUser } = req;
    const course = await Course.findByPk(req.params.id);

    if(course) {
        if(course.id === currentUser.id) {
            await course.destroy();
            res.status(204).end();
        } else {
            res.status(403).json({message: 'User in Not Authorized.'})
        }
    } else {
        res.status(404).json({message: 'Course Not Found.'})
    }
}))

module.exports = router;