// Using built-in fetch API

async function getOrderDetails(orderId) {
  try {
    console.log(`Fetching details for order: ${orderId}`);
    
    // Make request to the API endpoint
    const response = await fetch(`http://localhost:3000/api/weekly-orders/${orderId}`);
    const data = await response.json();
    
    if (!data.success) {
      console.error('Error fetching order:', data.error);
      return;
    }
    
    // Display order details
    const order = data.data;
    console.log('\n=== ORDER DETAILS ===');
    console.log(`Order ID: ${order.orderId}`);
    console.log(`Status: ${order.status}`);
    console.log(`Created: ${new Date(order.createdAt).toLocaleString()}`);
    console.log(`Credit Cost: ${order.creditCost}`);
    
    console.log('\n=== ITEMS ===');
    order.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.optionName} x${item.quantity}`);
      console.log(`   Day: ${item.dayId === 'sunday' ? 'Sunday' : 'Tuesday'}, Date: ${item.date}`);
    });
    
    console.log('\n=== DELIVERY INFO ===');
    console.log(`Area: ${order.area}`);
    console.log(`Phone: ${order.phoneNumber}`);
    
    const addr = order.deliveryAddress;
    let address = '';
    if (addr.unitNumber) address += `Unit ${addr.unitNumber}, `;
    address += `${addr.streetAddress}, ${addr.city}, ${addr.province}, ${addr.postalCode}, ${addr.country}`;
    console.log(`Address: ${address}`);
    
    if (order.specialInstructions) {
      console.log(`\nSpecial Instructions: ${order.specialInstructions}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Call the function with the order ID
getOrderDetails('WS-32867472');
