var express = require('express');
var router = express.Router();
var config = new require('../config')();
var stripe = require("stripe")(config.stripe.private_key);

router.post('/', function (req, res, next) {
    console.log('Stripe event ' + req.body.id + ' received.');
    // Verify the event by fetching it from Stripe
    stripe.events.retrieve(req.body.id, function(error, result) {
        if (error && config.environment == 'production') {
            console.log(error);
            return res.status(400).send('An event was received but not confirmed by Stripe.');
        }

        var event = req.body;
        if (config.environment == 'production') {
            event = result;
        }

        console.log(event);
        switch (event.type) {
            case 'customer.subscription.created':
                // The subscription has been created
                // Send the user a welcome to their Dewy paid plan message
                res.send();
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
                // Remove the stripeID from the user subscription
                // Send a subscription cancellation message, but they can resubscribe at any time
                res.send();
                break;

            case 'ping':
                res.send();
                break;

            default:
                res.status(400).send('A supported webhook type is required.');
        }
    });
});

module.exports = router;