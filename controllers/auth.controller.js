const { Users, Profiles, Roles } = require("../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

async function hashPassword(plaintextPassword) {
  const hash = await bcrypt.hash(plaintextPassword, 10);
  return hash;
}

const cryptPassword = async (password) => {
  const salt = await bcrypt.genSalt(5);
  return bcrypt.hash(password, salt);
};

function generateOTP() {
  var digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 6; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

module.exports = {
  getAllRole: async (req, res) => {
    try {
      const roles = await Roles.findMany();
      return res.status(201).json({
        roles,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Something went wrong" });
    }
  },

  createRole: async (req, res) => {
    try {
      const role = await Roles.create({
        data: {
          name: req.body.name,
        },
      });
      return res.status(201).json({
        role,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Something went wrong" });
    }
  },

  register: async (req, res) => {
    try {
      let date = new Date();
      date.setMinutes(date.getMinutes() + 5);
      date.toISOString();
      const hashed = await hashPassword(req.body.password);
      const user = await Users.create({
        data: {
          email: req.body.email,
          phone: req.body.phone,
          password: hashed,
          codeOTP: generateOTP(),
          OTPlimit: date,
          status: "inactive",
          role: {
            connect: { id: parseInt(req.body.roleId) },
          },
        },
      });

      const profile = await Profiles.create({
        data: {
          name: req.body.name,
          user: {
            connect: { id: user.id },
          },
        },
      });

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: "system@gmail.com",
        to: req.body.email,
        subject: "Account Verification",
        // html: `<p>Your OTP</p><h1>${user.codeOTP}</h1>`,
        html: `<div
        style="
          text-align: center;
          padding: 1rem;
          border-radius: 5px;
          background-color: #6148ff;
          color: white;
          font-family: 'Montserrat', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0 auto;
        "
      >
        <h1>Activation Account</h1>
        <img
          src="https://i.imgur.com/nhNpkBd.png"
          alt="One Academy"
          style="width: 45dvw"
        />
        <div
          style="
            background-color: white;
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 20px;
            color: black;
            max-width: 60dvw;
            max-height: 60dvh;
            margin-top: 10px;
            margin: 0 auto;
          "
        >
          <p>Hello <span style="font-weight: 700">${profile.name},</span></p>
  
          <p>
            Thank you for choosing to join OneAcademy!<br />
            Your account activation is almost complete. To finalize the activation
            process, please Enter the OTP below :
          </p>
  
          <p style="letter-spacing: 5px; font-size: 25px">
            <strong>${user.codeOTP}</strong>
          </p>
          <p>
            Your account will be successfully activated upon completion of these
            steps. If you did not initiate this action or have any concerns,
            please contact our support team immediately.
          </p>
        </div>
        <p>
          Thank you for choosing OneAcademy!<br />
          © 2023, One Academy. All rights reserved.
        </p>
      </div>`,
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.log(err);
          return res.status(400);
        }
        return res.status(200).json({
          message: "account is created, OTP sent",
          user,
        });
      });
    } catch (error) {
      console.log(error.message);
      return res.status(400).json({
        error,
      });
    }
  },

  verifyOTP: async (req, res) => {
    try {
      const acc = await Users.findUnique({
        where: {
          email: req.body.email,
        },
      });

      if (req.body.OTP == acc.codeOTP) {
        let now = new Date().toISOString();
        if (acc.OTPlimit.toISOString() > now) {
          await Users.update({
            data: {
              codeOTP: null,
              OTPlimit: null,
              status: "active",
            },
            where: {
              email: req.body.email,
            },
          });

          return res.status(200).json({
            message: "Your Account has activated",
          });
        } else {
          return res.status(400).json({
            message: "Your OTP is expired, try resetting it",
          });
        }
      } else {
        return res.status(200).json({
          message: "Your OTP is invalid",
        });
      }
    } catch (error) {
      console.log(error.message);
      return res.status(400).json({
        error,
      });
    }
  },

  resetOTP: async (req, res) => {
    try {
      let date = new Date();
      date.setMinutes(date.getMinutes() + 5);
      date.toISOString();
      const acc = await Users.update({
        data: {
          codeOTP: generateOTP(),
          OTPlimit: date,
        },
        where: {
          email: req.body.email,
        },
        include: {
          profile: true,
        },
      });

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: "system@gmail.com",
        to: req.body.email,
        subject: "Account Verification",
        html: `<div
            style="
              text-align: center;
              padding: 1rem;
              border-radius: 5px;
              background-color: #6148ff;
              color: white;
              font-family: 'Montserrat', Tahoma, Geneva, Verdana, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              flex-direction: column;
              min-height: 80dvh;
            "
          >
            <h1>Activation Account</h1>
            <img
              src="https://i.imgur.com/tpY1Mr8.png"
              alt="One Academy"
              style="width: 55dvw"
            />
            <div
              style="
                background-color: white;
                border-radius: 10px;
                padding: 1rem;
                margin-bottom: 20px;
                color: black;
                max-width: 70dvw;
                max-height: 50dvh;
                margin-top: 10px;
              "
            >
              <p>Hello <span style="font-weight: 700">${acc.profile.name},</span></p>
      
              <p>
                Thank you for choosing to join OneAcademy!<br />
                Your account activation is almost complete. To finalize the activation
                process, please Enter the OTP below :
              </p>
      
              <p style="letter-spacing: 5px; font-size: 25px">
                <strong>${acc.codeOTP}</strong>
              </p>
              <p>
                Your account will be successfully activated upon completion of these
                steps. If you did not initiate this action or have any concerns,
                please contact our support team immediately
              </p>
            </div>
            <p>
              Thank you for choosing OneAcademy!<br />
              © 2023, One Academy. All rights reserved.
            </p>
          </div>`,
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.log(err);
          return res.status(400);
        }
        return res.status(200).json({
          message: "We have sent a new OTP, check your email",
        });
      });
    } catch (error) {
      console.log(error.message);
      return res.status(400).json({
        error,
      });
    }
  },

  login: async (req, res) => {
    try {
      const findUser = await Users.findFirst({
        where: {
          email: req.body.email,
        },
      });

      if (!findUser) {
        return res.status(404).json({
          error: "Email tidak terdaftar!",
        });
      }

      if (findUser.status === "inactive") {
        return res.status(401).json({
          message: "Account is not activated, please enter OTP",
        });
      }

      if (bcrypt.compareSync(req.body.password, findUser.password)) {
        const token = jwt.sign(
          {
            id: findUser.id,
          },
          "secret_key",
          {
            expiresIn: "24h",
          }
        );
        return res.status(200).json({
          data: {
            token,
          },
          id: findUser.id,
        });
      }

      return res.status(403).json({
        error: "Invalid credentials",
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({
        error,
      });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const findUser = await Users.findFirst({
        where: {
          email: req.body.email,
        },
        include: {
          profile: true,
        },
      });

      if (!findUser) {
        return res.status(400).json({
          message: "User not found",
        });
      }

      const encrypt = await cryptPassword(req.body.email);

      await Users.update({
        data: {
          resetToken: encrypt,
        },
        where: {
          id: findUser.id,
        },
      });

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const mailOptions = {
        from: "system@gmail.com",
        to: req.body.email,
        subject: "Reset Password",
        // html: `<p>Reset Password </p><a href="localhost:5000/set-password/${encrypt}">Click Here</a><br></br><p>Paste this url to your browser if you cant click link above</p><p>localhost:5000/set-password/${encrypt}</p>`,
        html: `<div
        style="
          text-align: center;
          padding: 1rem;
          border-radius: 5px;
          background-color: #6148ff;
          color: white;
          font-family: 'Montserrat', Tahoma, Geneva, Verdana, sans-serif;
        "
      >
        <h1>Reset Password</h1>
        <img
          src="https://i.imgur.com/nhNpkBd.png"
          alt="One Academy"
          style="width: 45dvw"
        />
        <div
          style="
            background-color: white;
            border-radius: 10px;
            padding: 1rem;
            margin-bottom: 20px;
            color: black;
            max-width: 60dvw;
            max-height: 60dvh;
            margin-top: 10px;
            margin: 0 auto;
          "
        >
          <p>Hello <span style="font-weight: 700">${findUser.profile.name},</span></p>
  
          <p style="margin-bottom: 15px">
            We received a request to reset your account password. To proceed with
            the password reset, please click reset password button bellow:
          </p>
  
          <a
            href="https://oneacademy-staging.pemudasukses.tech/forgot/${encrypt}"
            style="
              background-color: #6148ff;
              color: white;
              padding: 10px;
              border-radius: 5px;
              text-decoration: none;
            "
            ><strong>Reset Password</strong></a
          >
  
          <p>
            Please note that this verification code is valid for a limited time.
            If you did not initiate this password reset or have any concerns,
            please contact our support team immediately.
          </p>
        </div>
  
        <p>
          Thank you for choosing OneAcademy!<br />
          © 2023, One Academy. All rights reserved.
        </p>
      </div>`,
      };

      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          console.log(err);
          return res.status(400).json({
            message: "Something went wrong",
          });
        }

        return res.status(200).json({
          message: "email sent",
        });
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        error,
      });
    }
  },

  setPassword: async (req, res) => {
    try {
      const findUser = await Users.findFirst({
        where: {
          resetToken: req.body.key,
        },
      });

      if (!findUser) {
        return res.status(400).json({
          message: "User not found",
        });
      }

      await Users.update({
        data: {
          password: await cryptPassword(req.body.password),
          resetToken: null,
        },
        where: {
          id: findUser.id,
        },
      });

      return res.status(200).json({
        message: "Password has changed",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        error,
      });
    }
  },
};
