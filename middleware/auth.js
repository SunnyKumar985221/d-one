const ErrorHandler = require("../utils/ErrorHandler");
const jwt = require("jsonwebtoken");
const User = require("../db/model/user");
const Shop = require("../db/model/shop");
const { createError } = require("./customError");
exports.isAuthenticated = async (req, res, next) => {
    try {
        const { accessToken } = req.cookies;
        if (!accessToken) {
            return next(createError(401, "Login First"));
        }
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
        req.user = await User.findById(decoded.id);
        next();
    } catch (error) {
        next(createError(401, "Something Went Wrong"));
    }
};



exports.isSeller = async (req, res, next) => {
    try {
        const { shopToken } = req.cookies;
        if (!shopToken) {
             return next(createError(400, "Seller need to Login"));
        }
        const decoded = jwt.verify(shopToken, process.env.JWT_SECRET_KEY);
        req.seller = await Shop.findById(decoded.id);
        next();
    } catch (error) {
        console.log(error);
        next(createError(500, "Server Error"));
    }
};


exports.isAdmin = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`${req.user.role} can not access this resources!`))
        };
        next();
    }
}