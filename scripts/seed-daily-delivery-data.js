// This script seeds the MongoDB database with mock data for the daily delivery system
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kapioo';

// Define models directly in the script to avoid import issues
const DaySchema = new mongoose.Schema({
  dayId: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  week: {
    type: Number,
    required: true,
    enum: [1, 2]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const ComboSchema = new mongoose.Schema({
  comboId: {
    type: String,
    required: true,
    unique: true
  },
  dayId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  calories: {
    type: Number,
    required: true
  },
  tags: [{
    type: String
  }],
  typeA: {
    dishes: [{
      type: String
    }],
    voucherType: {
      type: String,
      default: 'twoDish'
    }
  },
  typeB: {
    dishes: [{
      type: String
    }],
    voucherType: {
      type: String,
      default: 'threeDish'
    }
  }
}, { timestamps: true });

const TagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
}, { timestamps: true });

// Mock data from daily-delivery-management.tsx
const mockDays = {
  // Week 1
  'monday-w1': {
    date: 'Sep 1',
    displayName: 'monday',
    week: 1,
    combos: [
      {
        id: 'monday-w1-combo1',
        name: '套餐 1',
        calories: 650,
        tags: ["Fresh", "Healthy", "Vegetarian"],
        typeA: {
          dishes: ["红烧肉", "清炒时蔬", "杨枝甘露"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["红烧肉", "清炒时蔬", "杨枝甘露", "酸梅汤", "春卷"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'monday-w1-combo2',
        name: '套餐 2',
        calories: 850,
        tags: ["Gourmet", "Seafood"],
        typeA: {
          dishes: ["北京烤鸭", "松露炒饭", "芒果布丁"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["北京烤鸭", "松露炒饭", "芒果布丁", "花雕酒", "凉拌海蜇"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'tuesday-w1': {
    date: 'Sep 2',
    displayName: 'tuesday',
    week: 1,
    combos: [
      {
        id: 'tuesday-w1-combo1',
        name: '套餐 1',
        calories: 620,
        tags: ["Fresh", "High Protein"],
        typeA: {
          dishes: ["宫保鸡丁", "蒜蓉空心菜", "桂花糕"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["宫保鸡丁", "蒜蓉空心菜", "桂花糕", "乌龙茶", "鲜虾春卷"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'tuesday-w1-combo2',
        name: '套餐 2',
        calories: 780,
        tags: ["Gourmet", "Comfort Food"],
        typeA: {
          dishes: ["水煮鱼", "榨菜肉丝面", "红豆沙"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["水煮鱼", "榨菜肉丝面", "红豆沙", "青梅酒", "酱牛肉"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'wednesday-w1': {
    date: 'Sep 3',
    displayName: 'wednesday',
    week: 1,
    combos: [
      {
        id: 'wednesday-w1-combo1',
        name: '套餐 1',
        calories: 680,
        tags: ["Healthy", "Vegetarian"],
        typeA: {
          dishes: ["麻婆豆腐", "上汤娃娃菜", "芝麻汤圆"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["麻婆豆腐", "上汤娃娃菜", "芝麻汤圆", "菊花茶", "香菇青菜包"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'wednesday-w1-combo2',
        name: '套餐 2',
        calories: 820,
        tags: ["Gourmet", "High Protein"],
        typeA: {
          dishes: ["东坡肉", "虾仁炒蛋", "桃胶雪燕"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["东坡肉", "虾仁炒蛋", "桃胶雪燕", "梅子酒", "卤鸭翅"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'thursday-w1': {
    date: 'Sep 4',
    displayName: 'thursday',
    week: 1,
    combos: [
      {
        id: 'thursday-w1-combo1',
        name: '套餐 1',
        calories: 640,
        tags: ["Fresh", "Healthy"],
        typeA: {
          dishes: ["糖醋排骨", "蒜蓉西兰花", "椰汁西米露"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["糖醋排骨", "蒜蓉西兰花", "椰汁西米露", "龙井茶", "蟹黄小笼包"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'thursday-w1-combo2',
        name: '套餐 2',
        calories: 890,
        tags: ["Gourmet", "High Protein"],
        typeA: {
          dishes: ["葱爆羊肉", "干锅土豆片", "桂圆红枣羹"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["葱爆羊肉", "干锅土豆片", "桂圆红枣羹", "竹叶青酒", "凉拌木耳"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'friday-w1': {
    date: 'Sep 5',
    displayName: 'friday',
    week: 1,
    combos: [
      {
        id: 'friday-w1-combo1',
        name: '套餐 1',
        calories: 630,
        tags: ["Fresh", "Vegetarian"],
        typeA: {
          dishes: ["鱼香肉丝", "炝炒油菜", "奶黄包"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["鱼香肉丝", "炝炒油菜", "奶黄包", "普洱茶", "千层饼"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'friday-w1-combo2',
        name: '套餐 2',
        calories: 800,
        tags: ["Gourmet", "Comfort Food"],
        typeA: {
          dishes: ["辣子鸡", "虾仁豆腐", "蛋黄酥"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["辣子鸡", "虾仁豆腐", "蛋黄酥", "黄酒", "卤鸡爪"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'sunday-w1': {
    date: 'Sep 7',
    displayName: 'sunday',
    week: 1,
    combos: [
      {
        id: 'sunday-w1-combo1',
        name: '套餐 1',
        calories: 660,
        tags: ["Fresh", "Healthy"],
        typeA: {
          dishes: ["回锅肉", "蒜泥白肉", "豆沙包"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["回锅肉", "蒜泥白肉", "豆沙包", "铁观音", "香酥鸭"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'sunday-w1-combo2',
        name: '套餐 2',
        calories: 830,
        tags: ["Seafood", "Gourmet"],
        typeA: {
          dishes: ["清蒸鲈鱼", "腊味炒饭", "龙眼甜汤"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["清蒸鲈鱼", "腊味炒饭", "龙眼甜汤", "绍兴酒", "盐水鸭"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  // Week 2
  'monday-w2': {
    date: 'Sep 8',
    displayName: 'monday',
    week: 2,
    combos: [
      {
        id: 'monday-w2-combo1',
        name: '套餐 1',
        calories: 610,
        tags: ["Fresh", "Vegetarian"],
        typeA: {
          dishes: ["小笼包", "上海炒面", "芒果西米露"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["小笼包", "上海炒面", "芒果西米露", "乌梅汁", "锅贴"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'monday-w2-combo2',
        name: '套餐 2',
        calories: 840,
        tags: ["Gourmet", "Comfort Food"],
        typeA: {
          dishes: ["梅菜扣肉", "蛋炒饭", "红豆糯米糍"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["梅菜扣肉", "蛋炒饭", "红豆糯米糍", "桂花酒", "凉拌海带"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'tuesday-w2': {
    date: 'Sep 9',
    displayName: 'tuesday',
    week: 2,
    combos: [
      {
        id: 'tuesday-w2-combo1',
        name: '套餐 1',
        calories: 670,
        tags: ["Seafood", "Healthy"],
        typeA: {
          dishes: ["酸菜鱼", "蒜蓉茼蒿", "桃胶银耳羹"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["酸菜鱼", "蒜蓉茼蒿", "桃胶银耳羹", "茉莉花茶", "虾饺"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'tuesday-w2-combo2',
        name: '套餐 2',
        calories: 750,
        tags: ["Vegetarian", "Comfort Food"],
        typeA: {
          dishes: ["干煸四季豆", "葱油拌面", "芋圆"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["干煸四季豆", "葱油拌面", "芋圆", "米酒", "卤水鸡"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'wednesday-w2': {
    date: 'Sep 10',
    displayName: 'wednesday',
    week: 2,
    combos: [
      {
        id: 'wednesday-w2-combo1',
        name: '套餐 1',
        calories: 620,
        tags: ["Vegetarian", "Healthy"],
        typeA: {
          dishes: ["鱼香茄子", "蒸蛋", "桂花糖藕"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["鱼香茄子", "蒸蛋", "桂花糖藕", "菊花普洱", "萝卜糕"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'wednesday-w2-combo2',
        name: '套餐 2',
        calories: 880,
        tags: ["Seafood", "Gourmet"],
        typeA: {
          dishes: ["香辣蟹", "扬州炒饭", "椰汁糕"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["香辣蟹", "扬州炒饭", "椰汁糕", "玫瑰露酒", "卤水鹅翅"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'thursday-w2': {
    date: 'Sep 11',
    displayName: 'thursday',
    week: 2,
    combos: [
      {
        id: 'thursday-w2-combo1',
        name: '套餐 1',
        calories: 690,
        tags: ["High Protein", "Fresh"],
        typeA: {
          dishes: ["蚝油牛肉", "清炒菠菜", "杏仁豆腐"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["蚝油牛肉", "清炒菠菜", "杏仁豆腐", "铁观音", "灌汤包"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'thursday-w2-combo2',
        name: '套餐 2',
        calories: 810,
        tags: ["Comfort Food", "Gourmet"],
        typeA: {
          dishes: ["辣椒炒肉", "腊肠煲仔饭", "莲子羹"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["辣椒炒肉", "腊肠煲仔饭", "莲子羹", "黄酒", "卤水鸭舌"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'friday-w2': {
    date: 'Sep 12',
    displayName: 'friday',
    week: 2,
    combos: [
      {
        id: 'friday-w2-combo1',
        name: '套餐 1',
        calories: 640,
        tags: ["Healthy", "Fresh"],
        typeA: {
          dishes: ["香菇滑鸡", "上汤西洋菜", "豆腐花"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["香菇滑鸡", "上汤西洋菜", "豆腐花", "大红袍", "蛋挞"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'friday-w2-combo2',
        name: '套餐 2',
        calories: 860,
        tags: ["Gourmet", "Comfort Food"],
        typeA: {
          dishes: ["咕噜肉", "干炒牛河", "姜汁撞奶"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["咕噜肉", "干炒牛河", "姜汁撞奶", "桃花酿", "烧卖"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
  'sunday-w2': {
    date: 'Sep 14',
    displayName: 'sunday',
    week: 2,
    combos: [
      {
        id: 'sunday-w2-combo1',
        name: '套餐 1',
        calories: 650,
        tags: ["Fresh", "High Protein"],
        typeA: {
          dishes: ["叉烧", "虾仁云吞", "杨枝甘露"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["叉烧", "虾仁云吞", "杨枝甘露", "普洱", "萝卜牛腩煲"],
          voucherType: 'threeDish'
        }
      },
      {
        id: 'sunday-w2-combo2',
        name: '套餐 2',
        calories: 790,
        tags: ["Gourmet", "Comfort Food"],
        typeA: {
          dishes: ["白切鸡", "荷叶饭", "芝麻糊"],
          voucherType: 'twoDish'
        },
        typeB: {
          dishes: ["白切鸡", "荷叶饭", "芝麻糊", "竹叶青", "卤水鸡爪"],
          voucherType: 'threeDish'
        }
      }
    ]
  },
};

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Register models
    const Day = mongoose.model('Day', DaySchema);
    const Combo = mongoose.model('Combo', ComboSchema);
    const Tag = mongoose.model('Tag', TagSchema);

    // Clear existing data
    console.log('Clearing existing data...');
    await Day.deleteMany({});
    await Combo.deleteMany({});
    await Tag.deleteMany({});
    console.log('Existing data cleared');

    // Extract unique tags
    const uniqueTags = new Set();
    Object.values(mockDays).forEach(day => {
      day.combos.forEach(combo => {
        combo.tags.forEach(tag => uniqueTags.add(tag));
      });
    });

    // Insert tags
    console.log('Inserting tags...');
    for (const tag of uniqueTags) {
      await Tag.create({ name: tag });
    }
    console.log(`Inserted ${uniqueTags.size} tags`);

    // Insert days and combos
    console.log('Inserting days and combos...');
    for (const [dayId, day] of Object.entries(mockDays)) {
      // Create day
      const newDay = await Day.create({
        dayId,
        displayName: day.displayName,
        date: day.date,
        week: day.week,
        isActive: true
      });
      console.log(`Created day: ${dayId}`);

      // Create combos for this day
      for (const combo of day.combos) {
        await Combo.create({
          comboId: combo.id,
          dayId,
          name: combo.name,
          calories: combo.calories,
          tags: combo.tags,
          typeA: combo.typeA,
          typeB: combo.typeB
        });
      }
      console.log(`Created ${day.combos.length} combos for ${dayId}`);
    }

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seed function
seedDatabase();
