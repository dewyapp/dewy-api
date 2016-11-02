var express = require('express');
var router = express.Router();
var User = require('../models/user');
var email = require('../helpers/email');
var moment = require('moment');
var config = require('../config');
var stripe = require("stripe")(config.stripe.private_key);

router.post('/', function (req, res, next) {
    if (config.debug) {
        console.log('Stripe event ' + req.body.id + ' of type ' + req.body.type + ' received');
    }

    // Verify the event by fetching it from Stripe
    stripe.events.retrieve(req.body.id, function(error, result) {
        if (error && config.stripe.verifyEvents) {
            if (config.debug) {
                console.error('The event was received but not confirmed by Stripe');
            }
            return res.status(400).send('The event was received but not confirmed by Stripe');
        }

        var event = req.body;
        if (config.stripe.verifyEvents) {
            event = result;
        }

        // Get customer of Stripe event
        var stripeID = event.data.object.customer;
        User.getUidByStripeID(stripeID, function(error, result) {
            if (error) {
                if (config.debug) {
                    console.error(error);
                }
                return res.status(500).send(error);
            }
            if (result === false) {
                if (config.debug) {
                    console.error('The customer ' + stripeID + ' cannot be found');
                }
                return res.send('The customer ' + stripeID + ' cannot be found');
            }
            User.get(result, function(error, result) {
                if (error) {
                    if (config.debug) {
                        console.error(error);
                    }
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
                                text: 'Hi ' + user.username + '. Your Dewy subscription has been cancelled. You can still sign on to Dewy but features will be disabled. You can resubscribe at any time at ' + config.website + '.',
                                html: 'Hi ' + user.username + '.<br/>Your Dewy subscription has been cancelled. You can still sign on to Dewy but features will be disabled. You can resubscribe at any time at ' + config.website + '.'
                            }, function(error, result) {
                                res.send();
                            });
                        });
                        break;

                    case 'invoice.created':
                        // The user is being rebilled for the next month
                        // Send an email with the payment details
                        var detailsText = '';
                        var detailsHTML = '</font></p><table border="1" frame="hsides" rules="rows" bordercolor="#EEE" cellpadding="14" width="100%">';
                        for (line in event.data.object.lines.data) {
                            var periodStart = moment.unix(event.data.object.lines.data[line].period.start).format("YYYY/MM/DD");
                            var periodEnd = moment.unix(event.data.object.lines.data[line].period.end).format("YYYY/MM/DD");
                            detailsText = detailsText + "\n" + event.data.object.lines.data[line].plan.id.charAt(0).toUpperCase() + event.data.object.lines.data[line].plan.id.slice(1) + ' ' + event.data.object.lines.data[line].plan.object + ', ' + periodStart + ' to ' + periodEnd + ', $' + event.data.object.lines.data[line].amount/100 + ' ' + event.data.object.lines.data[line].currency.toUpperCase();
                            detailsHTML = detailsHTML + '<tr><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><strong>' + event.data.object.lines.data[line].plan.id.charAt(0).toUpperCase() + event.data.object.lines.data[line].plan.id.slice(1) + ' ' + event.data.object.lines.data[line].plan.object + '</strong></span></td><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><strong>' + periodStart + ' to ' + periodEnd + '</strong></span></td><td><span style="font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><strong>$' + event.data.object.lines.data[line].amount/100 + ' ' + event.data.object.lines.data[line].currency.toUpperCase() + '</strong></span></td></tr>'; 
                        }
                        detailsHTML = detailsHTML + '</table><p style="padding: 28px 0 28px 0;font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666"><font color="#666">';

                        var periodMonth = moment.unix(event.data.object.period_start).format("MMMM");
                        var periodStart = moment.unix(event.data.object.period_start).format("MMMM Do YYYY");
                        email.send({
                            to: user.email,
                            subject: 'Your Dewy invoice for ' + periodMonth,
                            text: 'Hi ' + user.username + '. For the period starting ' + periodStart + ', you will be charged a total of $' + event.data.object.amount_due/100 + ' ' + event.data.object.currency.toUpperCase() + '. Details: ' + detailsText + ' Thank you for using Dewy.',
                            html: 'Hi ' + user.username + '.<br/>For the period starting ' + periodStart + ', you will be charged a total of <strong>$' + event.data.object.amount_due/100 + ' ' + event.data.object.currency.toUpperCase() + '</strong>. Details:</p>' + detailsHTML + '<p style="padding: 28px 0 28px 0;font-family: Helvetica,Arial,sans-serif;font-size:14px;color:#666">Thank you for using Dewy.'
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
                        var text = 'Hi ' + user.username + '. The charge to your credit card ending with ' + event.data.object.last4 + ' has failed for a final time and your subscription will be cancelled. You can resubscribe at any time at ' + config.website + '.';
                        var html = 'Hi ' + user.username + '.<br/>The charge to your credit card ending with ' + event.data.object.last4 + ' has failed for a final time and your subscription will be cancelled. You can resubscribe at any time at ' + config.website + '.';
                        
                        if (event.data.next_payment_attempt) {
                            var subject = 'Your Dewy invoice payment failed';
                            var text = 'Hi ' + user.username + '. The charge to your credit card ending with ' + event.data.object.last4 + ' has failed. Please update your credit card information at ' + config.website + '.';
                            var html = 'Hi ' + user.username + '.<br/>The charge to your credit card ending with <strong>' + event.data.object.last4 + '</strong> has failed. Please update your credit card information at ' + config.website + '.';
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

                    default:
                        res.send("Hi Stripe, I'm not doing anything with this webhook type but thanks for sending!");
                }
            });
        });
    });
});

module.exports = router;