var express = require('express');
var router = express.Router();
var User = require('../models/user');
var email = require('../helpers/email');
var config = new require('../config')();
var stripe = require("stripe")(config.stripe.private_key);

router.post('/', function (req, res, next) {
    console.log('Stripe event ' + req.body.id + ' received.');
    // Verify the event by fetching it from Stripe
    stripe.events.retrieve(req.body.id, function(error, result) {
        if (error && config.environment == 'production') {
            console.error('An event was received but not confirmed by Stripe.');
            return res.status(400).send('An event was received but not confirmed by Stripe.');
        }

        var event = req.body;
        if (config.environment == 'production') {
            event = result;
        }

        // Get customer of Stripe event
        var stripeID = event.data.object.customer;
        User.getUidByStripeID(stripeID, function(error, result) {
            if (error) {
                console.error(error);
                return res.status(500).send(error);
            }
            if (result === false) {
                console.error('The customer ' + stripeID + ' cannot be found.');
                return res.status(400).send('The customer ' + stripeID + ' cannot be found.');
            }
            User.get(result, function(error, result) {
                if (error) {
                    console.error(error);
                    return res.status(500).send(error);
                }

                // We have the customer, now respond to the hook
                var user = result;
                switch (event.type) {
                    case 'customer.subscription.created':
                        // The subscription has been created
                        // Send the user a welcome to their Dewy paid plan message
                        email.send({
                            to: user.email,
                            subject: 'Your Dewy subscription has begun',
                            text: 'Hi ' + user.username + '. Thank you for starting your ' + event.data.object.plan.id + ' subscription to Dewy.',
                            html: 'Hi ' + user.username + '.<br/>Thank you for starting your ' + event.data.object.plan.id + ' subscription to Dewy.'
                        }, function(error, result) {
                            res.send();
                        });
                        break;

                    case 'customer.source.updated':
                        // The user has updated their card
                        // Send the user a update message confirming the card change
                        email.send({
                            to: user.email,
                            subject: 'Your credit card on file with Dewy has changed',
                            text: 'Hi ' + user.username + '. You have successfully updated your credit card details with Dewy to a card ending with ' + event.data.object.last4 + '.',
                            html: 'Hi ' + user.username + '.<br/>You have successfully updated your credit card details with Dewy to a card ending with <strong>' + event.data.object.last4 + '</strong>.'
                        }, function(error, result) {
                            res.send();
                        });
                        break;

                    case 'customer.subscription.updated':
                        // The user has changed their plan type
                        // Send the user a update message confirming their new plan type
                        res.send();
                        break;

                    case 'invoice.payment_succeeded':
                        // The user paid for the month
                        // Update the user subscription with the new end date
                        res.send();
                        break;

                    case 'invoice.payment_failed':
                        // The user failed to pay for the month
                        // Dewy's Stripe settings dictate the amount of failures before subscription deletion
                        // Send a warning message
                        res.send();
                        break;

                    case 'customer.subscription.deleted':
                        // The user has failed to pay repeatedly
                        // Remove the subscriptionID from the user subscription
                        // Send a subscription cancellation message, but they can resubscribe at any time
                        user.setSubscription(null, null, null, null, false);
                        user.update(null, function (error, result) {
                            if (error) {
                                if (error.error) {
                                    return res.status(500).send(error.error);
                                }
                                else {
                                    return res.status(400).send(error);
                                }
                                email.send({
                                    to: user.email,
                                    subject: 'Your Dewy subscription has been cancelled',
                                    text: 'Hi ' + user.username + '. Your Dewy subscription has been cancelled. You can still sign on to Dewy but features will be disabled. You can resubscribe at any time at ' + config.website.url,
                                    html: 'Hi ' + user.username + '.<br/>Your Dewy subscription has been cancelled. You can still sign on to Dewy but features will be disabled. You can resubscribe at any time at ' + config.website.url
                                }, function(error, result) {
                                    res.send();
                                });
                            }
                        });
                        break;

                    case 'ping':
                        res.send();
                        break;

                    default:
                        console.error('A supported webhook type is required.');
                        res.status(400).send('A supported webhook type is required.');
                }
            });
        });
    });
});

module.exports = router;