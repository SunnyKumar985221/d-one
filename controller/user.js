const router = require("express").Router();
const User = require("../db/model/user");
const path = require("path");
const { upload } = require("../multer");
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendMail");
const sendToken = require("../middleware/saveingToken");
const { isAuthenticated, isAdmin } = require("../middleware/auth");
const { createError } = require("../middleware/customError");
const createActivationToken = require("../middleware/activationToken");

// When user login 
router.post("/login-user", async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(createError(404, "Wrong Email address"));
    }

    if (user.password !== req.body.password) {
      return next(createError(404, "Wrong Password"));
    }
    const accessToken = jwt.sign({
      id: user._id,
      name: user.name,
      isAdmin: user.isAdmin
    },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "3d" }
    );
    const { password, ...others } = user._doc;
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      path: "/",
    }).status(200).json({ ...others, accessToken });
  } catch (err) {
    console.log(err);
    return next(createError(404, "Some thing went wrong 1"));
  };

});

// when user register 
router.post("/create-user", upload.single("file"), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userEmail = await User.findOne({ email });

    if (userEmail) {
      const filename = req.file.filename;
      const filePath = `uploads/${filename}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          res.status(500).json({ message: "Error deleting file" });
        }
      });
      console.log('Email In Use');
      return next(createError(400, "Email Already In Use"));
    }

    const filename = req.file.filename;
    const fileUrl = path.join(filename);

    const user = {
      name: name,
      email: email,
      password: password,
      avatar: fileUrl,
    };

    const activationToken = createActivationToken(user);
    const activationUrl = `http://localhost:3000/activation/${activationToken}`;
    try {
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        message: `<html>
        <body>
          <h1>Hello ${user.name},</h1>
          <p>Please click on the link to activate your account:</p>
          <a href="${activationUrl}">${activationUrl}</a>
        </body>
      </html>`,
      });
      res.status(201).json({
        success: true,
        message: `please check your email:- ${user.email} to activate your account!`,
      });
    } catch (error) {
      return next(createError(500, "Something Went Wrong 2"));

    }
  } catch (error) {
    return next(createError(500, error.message));
  }
});

// when user verfiy its email ( activate user )
router.post("/activation", async (req, res, next) => {
  try {
    const { activation_token } = req.body;
    const newUser = jwt.verify(activation_token, process.env.ACTIVATION_SECRET);

    if (!newUser) {
      return next(createError(400, "Invalid token"));
    }

    const { name, email, avatar, password } = newUser;
    let user = await User.findOne({ email });

    if (user) {
      return next(createError(400, "Email Already In Use"));
    }

    user = await User.create({ name, email, avatar, password });
    sendToken(user, 201, res);
  } catch (error) {
    return next(createError(500, "Something Went Wrong"));
  }
});

// load user
router.get("/getuser", isAuthenticated, async (req, res, next) => {
  try {
    const { accessToken } = req.cookies;
    if (!accessToken) {
      next(createError(401, "User need to Login"));
    }
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET_KEY);
    req.user = await User.findById(decoded.id);
    next();
    const user = req.user;
    if (!user) {
      return next(createError(400, "User doesn't exists"));
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(createError(500, error.message));
  }
});

// log out user
router.get("/logout", (req, res, next) => {
  try {
    res.cookie("accessToken", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
    res.status(201).json({
      success: true,
      message: "Log out successful!",
    });
  } catch (error) {
    return next(createError(500, error.message));
  }
});

// update user info
router.put("/update-user-info", isAuthenticated, async (req, res, next) => {
  try {
    const { email, password, phoneNumber, name } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return next(createError(404, "User not found"));
    }
    user.name = name;
    user.email = email;
    user.phoneNumber = phoneNumber;

    await user.save();
    res.status(201).json({ user });
  } catch (error) {
    return next(createError(500, error.message));
  }
});

// update user avatar
router.put("/update-avatar", isAuthenticated, upload.single("image"), async (req, res, next) => {
  try {

    const existsUser = req.user;
    const existAvatarPath = `uploads/${existsUser.avatar}`;
    fs.unlinkSync(existAvatarPath);
    const fileUrl = path.join(req.file.filename);
    const user = await User.findByIdAndUpdate(req.user.id, {
      avatar: fileUrl,
    });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error.message);
    return next(createError(500, 'Request Failed'));
  }
});

// update user addresses
router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      const sameTypeAddress = user.addresses.find(
        (address) => address.addressType === req.body.addressType
      );
      if (sameTypeAddress) {
        return next(
          new ErrorHandler(`${req.body.addressType} address already exists`)
        );
      }

      const existsAddress = user.addresses.find(
        (address) => address._id === req.body._id
      );

      if (existsAddress) {
        Object.assign(existsAddress, req.body);
      } else {
        // add the new address to the array
        user.addresses.push(req.body);
      }

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete user address
router.delete(
  "/delete-user-address/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const addressId = req.params.id;

      console.log(addressId);

      await User.updateOne(
        {
          _id: userId,
        },
        { $pull: { addresses: { _id: addressId } } }
      );

      const user = await User.findById(userId);

      res.status(200).json({ success: true, user });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select("+password");

      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect!", 400));
      }

      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandler("Password doesn't matched with each other!", 400)
        );
      }
      user.password = req.body.newPassword;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// find user infoormation with the userId
router.get(
  "/user-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all users --- for admin
router.get(
  "/admin-all-users",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const users = await User.find().sort({
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        users,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete users --- admin
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return next(
          new ErrorHandler("User is not available with this id", 400)
        );
      }

      await User.findByIdAndDelete(req.params.id);

      res.status(201).json({
        success: true,
        message: "User deleted successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;
