exports.retrieve = function(){
    switch (process.env.NODE_ENV) {
        case 'production':
            return process.env.NODE_ENV;
        default:
            return 'development';
    }
}