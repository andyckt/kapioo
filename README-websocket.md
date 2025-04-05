# Real-time Notifications with WebSockets

This document explains how to set up and use the real-time notification system implemented with Socket.IO.

## Architecture Overview

1. **Server-side**:
   - Custom Express/Node.js server with Next.js integration
   - Socket.IO server for real-time communication
   - Notification service extended to push updates via WebSockets

2. **Client-side**:
   - Socket.IO client integration
   - React hook for managing socket connections
   - Updates to NotificationBell component for real-time updates

## Setup and Installation

1. Install dependencies:
   ```
   npm install socket.io socket.io-client --legacy-peer-deps
   ```

2. Start the custom server with WebSocket support:
   ```
   npm run dev:socket
   ```

   For production:
   ```
   npm run start:socket
   ```

## Key Components

### 1. Custom Server (`server.js`)

The custom server initializes a Socket.IO instance alongside the Next.js application, handling user authentication and connection management.

### 2. Socket Utility (`lib/socket.ts`)

This utility provides functions for socket server initialization and sending notifications to specific users.

### 3. Socket Hook (`lib/hooks/useSocket.ts`)

A React hook that:
- Manages socket connections
- Handles authentication with user ID
- Processes incoming notifications
- Displays toast notifications in real-time

### 4. Notification Service Integration (`lib/services/notificationService.ts`)

The notification service has been extended to send WebSocket notifications whenever a database notification is created.

### 5. NotificationBell Component Updates

The component now:
- Shows connection status
- Receives and displays real-time notifications
- Updates the UI immediately when new notifications arrive

## How It Works

1. When a user logs in, the client establishes a WebSocket connection and authenticates with their user ID
2. The server associates the socket with the user's ID
3. When actions occur that generate notifications:
   - A database notification is created
   - A WebSocket message is sent to the user's connected sockets
   - The client receives the notification and updates the UI
   - The NotificationBell component displays the new notification immediately

## Testing

To test the real-time notification system:
1. Start the server with WebSocket support: `npm run dev:socket`
2. Log in to the application
3. Generate a notification (e.g., place an order)
4. Observe the real-time update in the NotificationBell component

## Troubleshooting

- If notifications aren't appearing in real-time, check the connection status indicator in the NotificationBell
- Verify the server logs for any connection issues
- Check browser console for WebSocket-related errors 