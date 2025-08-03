# Hostel Admin Portal

A comprehensive admin-only web application for managing hostel student registrations with Firebase integration.

## Features

✅ **Admin Authentication**
- Hardcoded admin credentials (`admin@gmail.com` / `admin_hostel@2025`)
- Session-based login (no Firebase Auth for admin)
- Admin-only access control

✅ **Student Registration**
- Complete student information form (name, email, phone, birthdate)
- Automatic room assignment based on payment amount
- Student account creation in Firebase Auth using email and birthdate
- Optional document upload support

✅ **Room Assignment System**
- ₹89,000 → A Block - Non AC
- ₹92,000 → E Block - Non AC  
- ₹1,15,000 → E Block - AC
- ₹1,35,000 → E New Floor - AC

✅ **File Management**
- Document upload to Firebase Storage
- Supports PDF, JPG, PNG, DOC, DOCX formats

✅ **Data Storage**
- Student data stored in Firebase Realtime Database
- Real-time registration statistics
- Consistent database with authentication

## Setup Instructions

### Prerequisites
- Modern web browser
- Internet connection for Firebase services
- Firebase project (already configured)

### Firebase Configuration
The application is already configured with your Firebase project:
- Project ID: `hostelapp-f5b0f`
- API Key: `AIzaSyDdBQnoQsQQmqyZtQNjcUG3puf-vJ3dj2Y`

### Local Development
1. Clone or download the project files
2. Open `index.html` in a web browser, or
3. Use a local server (recommended):

#### Option 1: Python Server
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Option 2: Node.js Server
```bash
# Install http-server globally
npm install -g http-server

# Start server
http-server -p 8000
```

#### Option 3: VS Code Live Server
- Install "Live Server" extension
- Right-click on `index.html`
- Select "Open with Live Server"

### Access the Application
1. Open your browser and navigate to:
   - Direct file: `file:///path/to/index.html`
   - Local server: `http://localhost:8000`

2. Login with admin credentials:
   - Email: `admin@gmail.com`
   - Password: `admin_hostel@2025`

## File Structure
```
hostel_admin/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── app.js             # JavaScript application logic
├── google-services.json # Firebase configuration
└── README.md          # This file
```

## Usage Guide

### Admin Login
1. Open the application
2. Enter admin credentials:
   - Email: `admin@gmail.com`
   - Password: `admin_hostel@2025`
3. Click "Login"

### Register Students
1. After login, you'll see the registration form
2. Fill in student details:
   - **Name**: Student's full name
   - **Email**: Student's email (will be used for their account)
   - **Phone**: 10-digit Indian phone number
   - **Birth Date**: Student's date of birth
   - **Amount Paid**: Select from dropdown (auto-assigns room)
   - **Documents**: Optional file uploads

3. The room will be automatically assigned based on amount paid
4. Click "Register Student"
5. Student account will be created with:
   - Email: As provided
   - Password: Birth date in DDMMYYYY format

### Student Login Credentials
When a student is registered, they receive:
- **Email**: As provided in registration
- **Password**: Birth date in DDMMYYYY format
  - Example: If birthdate is 15/03/2000, password is `15032000`

### View Statistics
The right panel shows real-time statistics:
- Total registrations
- Count by room type

## Technical Details

### Firebase Services Used
- **Authentication**: Only for student account creation (not for admin)
- **Realtime Database**: Student data storage
- **Storage**: Document file uploads

### Authentication Model
- **Admin**: Hardcoded credentials with session storage (no Firebase Auth)
- **Students**: Firebase Authentication accounts created during registration

### Data Structure
```javascript
// Student data in Realtime Database
// Path: /students/{uid}
{
  uid: "firebase-user-id",
  name: "Student Name",
  email: "student@example.com",
  phone: "9876543210",
  birthDate: "2000-03-15",
  amountPaid: 115000,
  roomAssignment: "E Block - AC",
  documents: [
    {
      name: "document.pdf",
      url: "https://firebase-storage-url",
      path: "documents/student@example.com/document.pdf"
    }
  ],
  registeredAt: 1640995200000,
  registeredBy: "admin@gmail.com"
}
```

### Security Features
- Hardcoded admin authentication with session management
- Firebase Auth for student account creation only
- Input validation and sanitization
- Secure file upload handling
- Firebase security rules (temporarily open for development)

## Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

**1. Login not working**
- Verify admin credentials are exactly: `admin@gmail.com` / `admin_hostel@2025`
- Clear browser cache/session storage if needed
- Check browser console for errors

**2. Student registration fails**
- Check all required fields are filled
- Verify email format is valid
- Ensure phone number is 10 digits starting with 6-9
- Check if student email already exists

**3. File upload issues**
- Verify file types are supported (PDF, JPG, PNG, DOC, DOCX)
- Check file size (Firebase has limits)
- Ensure stable internet connection

**4. Statistics not updating**
- Refresh the page
- Check Firebase Realtime Database console for data
- Verify database permissions

### Support
For technical issues:
1. Check browser console for errors
2. Verify Firebase configuration
3. Test with different browsers
4. Check network connectivity

## Development Notes

### Extending the Application
To add new features:
1. Room types: Update `ROOM_ASSIGNMENTS` in `app.js`
2. Form fields: Modify HTML form and validation logic
3. File types: Update file input accept attribute
4. Statistics: Add new counters in `loadStats()` function

### Firebase Rules
Since admin authentication is now hardcoded, the Firebase rules are temporarily open for development. For production, consider using proper authentication.

Development Realtime Database rules:
```json
{
  "rules": {
    "students": {
      "$uid": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /documents/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.token.email == "admin@gmail.com";
    }
  }
}
```

---

**Last Updated**: January 2025  
**Version**: 1.0.0
