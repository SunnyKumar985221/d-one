const createError = (statusCode, errorMessage) => {
    const err = new Error();
    err.status = statusCode || 500;
    err.message = errorMessage || "Something Went Wrong";
    return err;
}
module.exports = {createError};
