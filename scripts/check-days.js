require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const DaySchema = new mongoose.Schema({
  dayId: String,
  displayName: String,
  date: String,
  week: Number,
  isActive: Boolean,
}, { timestamps: true });

const Day = mongoose.models.Day || mongoose.model('Day', DaySchema);

async function checkDays() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const days = await Day.find({});
    console.log('\n=== Days in Database ===');
    console.log(`Total days found: ${days.length}\n`);
    
    days.forEach((day, index) => {
      console.log(`Day ${index + 1}:`);
      console.log(`  dayId: ${day.dayId}`);
      console.log(`  displayName: ${day.displayName}`);
      console.log(`  date: ${day.date}`);
      console.log(`  week: ${day.week}`);
      console.log(`  isActive: ${day.isActive}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDays();
