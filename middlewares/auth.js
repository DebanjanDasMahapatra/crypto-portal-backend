const jwt = require('jsonwebtoken');

const authentication = {
    authenticateAll: (req, res, next) => {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.secretKey);
            if(decoded.admin === false) {
                req.user = decoded;
                next();
            }
            else
                return res.status(401).json({
                    status: false,
                    message: "Not Authorized"
                });
        } catch (err) {
            return res.status(401).json({
                status: false,
                message: "Not Authorized",
                error: err
            });
        }
    },

    authenticateAdmin: (req,res,next) => {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.secretKey);
            if(decoded.admin === true) {
                req.user = decoded;
                if(process.env.ADMIN_EMAILS.split(",").indexOf(decoded.email) == -1)
                {
                    return res.status(401).json({
                        status: false,
                        message: "Not Authorized"
                    });
                }
                else
                {
                    next();
                }
            }
            else
                return res.status(401).json({
                    status: false,
                    message: "Not Authorized"
                });
        }
        catch (err) {
            return res.status(401).json({
                status: false,
                message: "Not Authorized",
                error: err
            });
        }
    }
}

module.exports = authentication;