import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import connectToDB from './database.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection

connectToDB();

// Password Schema
const passwordSchema = new mongoose.Schema({
  url: String,
  email: String,
  password: String,
  date: Date
});

const Password = mongoose.model('Password', passwordSchema);

// Routes
// Get all passwords
app.get('/api/passwords', async (req, res) => {
  try {
    const passwords = await Password.find();
    if(!passwords.length){
      console.log("No passwords found in the database.");
    }
    res.json(passwords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get passwords by URL
app.get('/api/passwords/url', async (req, res) => {
  try {
    const { url } = req.query;
    const passwords = await Password.find({ url });
    res.json(passwords);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save new password
app.post('/api/passwords', async (req, res) => {
  try {
    const password = new Password(req.body);
    await password.save();
    res.json(password);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete password
app.delete('/api/passwords/:id', async (req, res) => {
  try {
    await Password.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});