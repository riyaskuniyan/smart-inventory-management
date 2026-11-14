const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/u ser");

const createUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const users = [
      {
        name: "Manager",
        email: "manager@example.com",
        password: "Manager@12345",
        role: "manager"
      },
      {
        name: "Staff",
        email: "staff@example.com",
        password: "Staff@12345",
        role: "staff"
      }
    ];

    for (const user of users) {
      const existingUser = await User.findOne({
        email: user.email
      });

      if (existingUser) {
        console.log(`${user.email} already exists`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);

      await User.create({
        name: user.name,
        email: user.email,
        password: hashedPassword,
        role: user.role
      });

      console.log(`${user.role} account created`);
    }

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

createUsers();