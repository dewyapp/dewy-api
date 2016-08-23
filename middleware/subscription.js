var User = require('../models/user');

exports.require = function(type) {
    return function (req,res, next) {
        User.get(req.user.id, function(error, result) {
            if (error) {
                return res.status(500).send(error);
            }

            // Get subscription type
            var subscriptionType = result.subscription.type;
            if (result.subscription.endDate < Date.now()/1000) {
                subscriptionType = 'expired';
            }
            else if (subscriptionType == 'trial') {
                subscriptionType = 'basic';
            }

            // Determine if it's valid
            if (subscriptionType == 'expired' ||
                (type == 'pro' && subscriptionType == 'basic') ||
                (type == 'enterprise' && subscriptionType == 'basic') ||
                (type == 'enterprise' && subscriptionType == 'pro')
            ) {
                return res.status(402).send('You do not have a subscription that allows this request.');
            }
            next();
        });
    };
};