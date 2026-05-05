# Couples Money Request App

A cute, personalized app for sharing and managing money requests securely using Firebase.

## Setup Instructions

This app uses Firebase Authentication and Firestore. It comes with two predefined roles: Admin and User.

### Creating Accounts

To use the application, you need to manually bootstrap the users using the Login page on the frontend (or via Firebase Console).

1. Open the application.
2. In the Username field, type `admin` and choose a secure password. Click Login to register the admin account. (The app will automatically create `admin@app.local` in Firebase Auth, and set the role to `Admin`).
3. Now log out.
4. Go back to Login. In the Username field, type `gunj` and choose a password. Click Login. (The app creates `gunj@app.local` and assigns the `User` role to her). 
   - Note: The password must be at least 6 characters long (e.g., `Nomiogunj`).

### Environment

Firebase Configuration is controlled by `firebase-applet-config.json` and handled automatically by AI Studio.

If you are modifying security rules, ensure you test them using `npm run lint`.
