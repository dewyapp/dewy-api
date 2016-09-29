var User = require('../models/user');

exports.require = function(type) {
    return function (req,res, next) {
        User.get(req.user.id, function(error, result) {
            if (error) {
                return res.status(500).send(error);
            }
            var user = result;

            // Get subscription type
            var expired = user.getSubscriptionExpired();

            // Determine if it's valid
            if (expired ||
                (type == 'pro' && user.subscription.type == 'standard') ||
                (type == 'enterprise' && user.subscription.type == 'standard') ||
                (type == 'enterprise' && user.subscription.type == 'pro')
            ) {
                return res.status(402).send('You do not have a subscription that allows this request.');
            }
            next();
        });
    };
};