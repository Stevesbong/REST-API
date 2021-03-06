'use strict';
const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    class User extends Sequelize.Model { }
    User.init({
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        firstName: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Please provide your first name.'
                }
            }
        },
        lastName: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Please provide your last name.'
                }
            }
        },
        emailAddress: {
            type: Sequelize.STRING,
            allowNull: false,
            // check the email uniqueness.
            unique: true,
            validate: {
                notEmpty: {
                    msg: 'Please provide an Email.'
                },
                // check if email is valid email.
                isEmail: {
                    msg: 'Please provide a valid Email.'
                }
            }
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Please provide a Password'
                }
            }
        }
    }, { sequelize });

    User.associate = (models) => {
        User.hasMany(models.Course, {
            as: 'user',
            foreignKey: {
                fieldName: 'userId',
                allowNull: false
            }
        })
    };

    return User;
}