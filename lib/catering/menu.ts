export type CateringCategory = 'chinese' | 'japanese' | 'dessert'

export type CateringItem = {
  id: string
  name: string
  category: CateringCategory
  price: number
  unit: 'tray' | 'order' | 'batch'
  serves: string
  note?: string
}

// Prices and quantities are the final catering menu supplied by Kapioo.
export const cateringMenu: CateringItem[] = [
  { id: 'peppercorn-chicken', name: 'Sichuan Peppercorn Pulled Chicken', category: 'chinese', price: 78, unit: 'tray', serves: '12 share portions' },
  { id: 'yeung-chow-rice', name: 'Cantonese Yeung Chow Fried Rice', category: 'chinese', price: 66, unit: 'tray', serves: '12 share portions' },
  { id: 'cumin-lamb', name: 'Cumin Lamb Skewers', category: 'chinese', price: 39, unit: 'tray', serves: '12 skewers' },
  { id: 'tofu-shiitake', name: 'Braised Tofu & Shiitake Mushrooms', category: 'chinese', price: 66, unit: 'tray', serves: '12 share portions', note: 'Vegetarian base' },
  { id: 'soy-noodles', name: 'Cantonese Soy Sauce Fried Noodles', category: 'chinese', price: 60, unit: 'tray', serves: '12 share portions', note: 'Vegetarian base' },
  { id: 'duck-sliders', name: 'Peking Duck Sliders', category: 'chinese', price: 90, unit: 'tray', serves: '12 sliders' },
  { id: 'spare-ribs', name: 'Sweet and Sour Spare Ribs', category: 'chinese', price: 78, unit: 'tray', serves: '12 share portions' },
  { id: 'jasmine-rice', name: 'Tea-Infused Jasmine Rice', category: 'chinese', price: 24, unit: 'tray', serves: '12 share portions', note: 'Rice add-on · vegetarian base' },
  { id: 'miso-pork', name: 'Slow-Braised Miso Pork Belly', category: 'japanese', price: 66, unit: 'tray', serves: '12 share portions' },
  { id: 'sukiyaki-beef', name: 'Sweet-Soy Sukiyaki Beef', category: 'japanese', price: 78, unit: 'tray', serves: '12 share portions' },
  { id: 'nagoya-wings', name: 'Nagoya Maple Wings & Croffle', category: 'japanese', price: 90, unit: 'tray', serves: '24 wings + 12 croffles' },
  { id: 'gyoza', name: 'Golden Pan-Seared Gyoza', category: 'japanese', price: 20, unit: 'order', serves: '12 pieces' },
  { id: 'crab-roe-salad', name: 'Signature Crab Roe Salad', category: 'japanese', price: 59, unit: 'tray', serves: '12 share portions' },
  { id: 'takoyaki', name: 'Osaka Street-Style Takoyaki', category: 'japanese', price: 20, unit: 'order', serves: '12 pieces' },
  { id: 'sushi-rice', name: 'Japanese Sushi Rice', category: 'japanese', price: 36, unit: 'tray', serves: '12 share portions', note: 'Rice add-on · vegetarian base' },
  { id: 'matcha-tiramisu', name: 'Matcha Tiramisu Cups', category: 'dessert', price: 84, unit: 'batch', serves: '12 individual 8 oz cups' },
  { id: 'mini-pancakes', name: 'Mini Fluffy Japanese Pancakes', category: 'dessert', price: 66, unit: 'batch', serves: '12 pieces', note: 'Chocolate, strawberry or mango sauce' },
  { id: 'roll-cake', name: 'Roll Cake', category: 'dessert', price: 66, unit: 'batch', serves: '12 petite slices', note: 'Mango, matcha or strawberry' },
  { id: 'basque-cheesecake', name: 'Japanese Basque Cheesecake', category: 'dessert', price: 66, unit: 'batch', serves: '12 petite slices' },
]

export const cateringMenuById = new Map(cateringMenu.map(item => [item.id, item]))
export const cateringCurrency = (amount: number) => `$${amount.toFixed(2)}`
