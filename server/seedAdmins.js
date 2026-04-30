import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const admins = [
  {
    name: "Vinit Shah",
    email: "vinitshah@gmail.com",
    password: "Vinit@77",
    role: "ADMIN"
  },
  {
    name: "Arcadia Admin",
    email: "admin@arcadia.co.in",
    password: "Admin@77",
    role: "ADMIN"
  }
];

const seedAdmins = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('📡 Connected to MongoDB for seeding...');

    for (const admin of admins) {
      const existingUser = await User.findOne({ email: admin.email });
      if (!existingUser) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(admin.password, salt);
        
        await User.create({
          ...admin,
          password: hashedPassword
        });
        console.log(`✅ Admin created: ${admin.email}`);
      } else {
        // Ensure existing user has ADMIN role
        existingUser.role = 'ADMIN';
        await existingUser.save();
        console.log(`ℹ️ User ${admin.email} already exists, ensured ADMIN role.`);
      }
    }

    console.log('✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedAdmins();
