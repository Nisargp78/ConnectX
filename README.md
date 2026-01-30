# ConnectX - Real-time Messaging Application

A modern, feature-rich messaging platform built with React and Node.js. Connect with people, share moments, and enjoy seamless real-time communication.

---

## Features

### Communication
- **Real-time Messaging** - Instant message delivery powered by Socket.io
- **Online/Offline Status** - See who's online in real-time
- **Last Active Status** - Know when users were last active
- **Emoticons** - Express yourself with emoji support

### Message Management
- **Message Actions** - Edit and delete messages within a specific duration
- **Media Sharing** - Share media seamlessly
- **Message History** - Access your complete chat history

### User Experience
- **Profile Update** - Customize your profile with avatar and bio
- **Responsive Design** - Works perfectly on desktop and mobile

### Safety & Security
- **Abusive Text Detection** - Automatic detection and filtering of inappropriate content
- **Secure Authentication** - JWT-based secure authentication
- **Data Privacy** - All passwords are secure and encrypted

### Additional Features
- **User Discovery** - Find and connect with other users
- **Chat Interface** - Clean and intuitive messaging interface

---

### Setup .env file

```js
MONGODB_URI=...
PORT=5001
JWT_SECRET=...

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

NODE_ENV=development
```

### Build the app

```shell
npm run build
```

### Start the app

```shell
npm start
```
