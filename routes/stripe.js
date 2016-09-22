var express = require('express');
var router = express.Router();
var User = require('../models/user');
var email = require('../helpers/email');
var config = new require('../config')();
var stripe = require("stripe")(config.stripe.private_key);

router.post('/', function (req, res, next) {
    console.log('Stripe event ' + req.body.id + ' of type ' + req.body.type + ' received');
    console.log(req.body);
    
    // Verify the event by fetching it from Stripe
    stripe.events.retrieve(req.body.id, function(error, result) {
        if (error && config.environment == 'production') {
            console.error('The event was received but not confirmed by Stripe');
            return res.status(400).send('The event was received but not confirmed by Stripe');
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
                console.error('The customer ' + stripeID + ' cannot be found');
                return res.status(400).send('The customer ' + stripeID + ' cannot be found');
            }
            User.get(result, function(error, result) {
                if (error) {
                    console.error(error);
                    return res.status(500).send(error);
                }

                // We have the customer, now respond to the hook
                var user = result;
                switch (event.type) {
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

                    case 'customer.subscription.updated':
                        // The user's subscription has been updated
                        // Reflect the changes in Dewy
                        // If the plan type has changed, send the user an update message
                        var newPlan = event.data.object.plan.id;
                        var oldPlan = user.subscription.type;
                        user.setSubscription(null, event.data.current_period_end, newPlan);
                        user.update(null, function (error, result) {
                            if (error) {
                                if (error.error) {
                                    return res.status(500).send(error.error);
                                }
                                else {
                                    return res.status(400).send(error);
                                }
                                if (oldPlan != newPlan) {
                                    email.send({
                                        to: user.email,
                                        subject: 'Your Dewy subscription has changed',
                                        text: 'Hi ' + user.username + '. Your Dewy subscription has been changed from ' + oldPlan + ' to ' + newPlan + '.',
                                        html: 'Hi ' + user.username + '.<br/>Your Dewy subscription has been changed from ' + oldPlan + ' to ' + newPlan + '.'
                                    }, function(error, result) {
                                        res.send();
                                    });
                                }
                                else {
                                    res.send();
                                }
                            }
                        });
                        break;

                    case 'customer.subscription.deleted':
                        // The user has failed to pay repeatedly
                        // Remove the subscriptionID from the user subscription
                        // Change the subscription end date to right now
                        // Send a subscription cancellation message, but they can resubscribe at any time
                        user.setSubscription(null, Math.round(new Date().getTime() / 1000), null, null, false);
                        user.update(null, function (error, result) {
                            if (error) {
                                if (error.error) {
                                    return res.status(500).send(error.error);
                                }
                                else {
                                    return res.status(400).send(error);
                                }
                            }
                            email.send({
                                to: user.email,
                                subject: 'Your Dewy subscription has been cancelled',
                                text: 'Hi ' + user.username + '. Your Dewy subscription has been cancelled. You can still sign on to Dewy but features will be disabled. You can resubscribe at any time at ' + config.website.url,
                                html: 'Hi ' + user.username + '.<br/>Your Dewy subscription has been cancelled. You can still sign on to Dewy but features will be disabled. You can resubscribe at any time at ' + config.website.url
                            }, function(error, result) {
                                res.send();
                            });
                        });
                        break;

                    case 'invoice.created':
                        // The user is being rebilled for the next month
                        // Send an email with the payment details
                        event.data.current_period_end
                        email.send({
                            to: user.email,
                            subject: 'Your Dewy invoice for ' + event.data.period_start*1000,
                            text: 'Hi ' + user.username + '. For the period starting ' + event.data.period_start*1000 + ', you will be charged $' + event.data.amount_due + ' ' + event.data.currency.toUpperCase() + ' for the Dewy ' + event.data.object.plan.id + ' plan. Thank you for using Dewy.',
                            html: 'Hi ' + user.username + '.<br/>For the period starting ' + event.data.period_start*1000 + ', you will be charged <strong>$' + event.data.amount_due + ' ' + event.data.currency.toUpperCase() + '</strong> for the Dewy ' + event.data.object.plan.id + ' plan.<br/><br/>Thank you for using Dewy.'
                        }, function(error, result) {
                            res.send();
                        });
                        break;

                    case 'invoice.payment_succeeded':
                        // The user paid for the month
                        // Maybe record this for my own safe keeping at some point? Or is the Stripe dashboard enough? Probably.
                        res.send();
                        break;

                    case 'invoice.payment_failed':
                        // The user failed to pay for the month
                        // Dewy's Stripe settings dictate the amount of failures before subscription deletion
                        // Send a warning message

                        var subject = 'Your Dewy invoice payment failed for a final time';
                        var text = 'Hi ' + user.username + '. The charge to your credit card ending with ' + event.data.object.last4 + ' has failed for a final time and your subscription will be cancelled. You can resubscribe at any time at ' + config.website.url;
                        var html = 'Hi ' + user.username + '.<br/>The charge to your credit card ending with ' + event.data.object.last4 + ' has failed for a final time and your subscription will be cancelled. You can resubscribe at any time at ' + config.website.url;
                        
                        if (event.data.next_payment_attempt) {
                            var subject = 'Your Dewy invoice payment failed';
                            var text = 'Hi ' + user.username + '. The charge to your credit card ending with ' + event.data.object.last4 + ' has failed. Please update your credit card information at ' + config.website.url;
                            var html = 'Hi ' + user.username + '.<br/>The charge to your credit card ending with <strong>' + event.data.object.last4 + '</strong> has failed. Please update your credit card information at ' + config.website.url;
                        }

                        email.send({
                            to: user.email,
                            subject: subject,
                            text: text,
                            html: html
                        }, function(error, result) {
                            res.send();
                        });
                        break;

                    case 'ping':
                        res.send();
                        break;

                    default:
                        console.error('A supported webhook type is required');
                        res.status(400).send('A supported webhook type is required');
                }
            });
        });
    });
});

module.exports = router;