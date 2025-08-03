// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDdBQnoQsQQmqyZtQNjcUG3puf-vJ3dj2Y",
    authDomain: "hostelapp-f5b0f.firebaseapp.com",
    databaseURL: "https://hostelapp-f5b0f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hostelapp-f5b0f",
    storageBucket: "hostelapp-f5b0f.firebasestorage.app",
    messagingSenderId: "809993943114",
    appId: "1:809993943114:android:06b950ec808276a6490eb3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Admin credentials (hardcoded as per requirements)
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin_hostel@2025";

// Room assignment mapping
const ROOM_ASSIGNMENTS = {
    89000: "A Block - Non AC",
    92000: "E Block - Non AC", 
    115000: "E Block - AC",
    135000: "E New Floor - AC"
};

// Global variables
let isAdminLoggedIn = false;
let registrationStats = {
    total: 0,
    aBlock: 0,
    eBlockNonAC: 0,
    eBlockAC: 0,
    eNewFloor: 0
};

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const loginForm = document.getElementById('loginForm');
const studentForm = document.getElementById('studentForm');
const amountPaidSelect = document.getElementById('amountPaid');
const assignedRoomInput = document.getElementById('assignedRoom');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initializing...');
    
    // Check if admin is already logged in (session storage)
    const storedLogin = sessionStorage.getItem('adminLoggedIn');
    if (storedLogin === 'true') {
        isAdminLoggedIn = true;
        showAdminSection();
        loadStats();
    } else {
        showLoginSection();
    }
    
    hideLoadingScreen();
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', handleLogin);
    
    // Student registration form
    studentForm.addEventListener('submit', handleStudentRegistration);
    
    // Amount selection change
    amountPaidSelect.addEventListener('change', updateRoomAssignment);
    
    // Form reset
    studentForm.addEventListener('reset', function() {
        clearMessages();
        assignedRoomInput.value = '';
    });
}

function hideLoadingScreen() {
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 1000);
}

function showLoginSection() {
    loginSection.style.display = 'flex';
    adminSection.style.display = 'none';
}

function showAdminSection() {
    loginSection.style.display = 'none';
    adminSection.style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginError = document.getElementById('loginError');
    
    // Clear previous errors
    loginError.style.display = 'none';
    
    // Validate admin credentials (hardcoded)
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        showError(loginError, 'Invalid admin credentials. Please check your email and password.');
        return;
    }
    
    try {
        // Disable submit button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Logging in...';
        
        // Simulate login delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set login state
        isAdminLoggedIn = true;
        sessionStorage.setItem('adminLoggedIn', 'true');
        
        console.log('Admin logged in successfully');
        showAdminSection();
        loadStats();
        
    } catch (error) {
        console.error('Login error:', error);
        showError(loginError, 'Login failed: ' + error.message);
        
        // Re-enable submit button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Login';
    }
}

async function handleStudentRegistration(e) {
    e.preventDefault();
    
    const formData = getFormData();
    const registrationError = document.getElementById('registrationError');
    const registrationSuccess = document.getElementById('registrationSuccess');
    
    // Clear previous messages
    clearMessages();
    
    // Validate form
    if (!validateForm(formData)) {
        return;
    }
    
    try {
        // Disable submit button
        const submitBtn = studentForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Registering...';
        
        // Create student account in Firebase Auth
        console.log('Creating student account...');
        const studentPassword = generatePasswordFromBirthdate(formData.birthDate);
        const studentCredential = await auth.createUserWithEmailAndPassword(formData.email, studentPassword);
        const studentUid = studentCredential.user.uid;
        
        // Upload documents if any
        let documentUrls = [];
        if (formData.documents && formData.documents.length > 0) {
            console.log('Uploading documents...');
            documentUrls = await uploadDocuments(formData.documents, formData.email);
        }
        
        // Prepare student data
        const studentData = {
            uid: studentUid,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            birthDate: formData.birthDate,
            amountPaid: parseInt(formData.amountPaid),
            roomAssignment: ROOM_ASSIGNMENTS[formData.amountPaid],
            documents: documentUrls,
            registeredAt: firebase.database.ServerValue.TIMESTAMP,
            registeredBy: ADMIN_EMAIL
        };
        
        // Save to Realtime Database
        console.log('Saving student data to Realtime Database...');
        await database.ref('students/' + studentUid).set(studentData);
        
        console.log('Student registered successfully:', studentData);
        
        // Show success message
        showSuccess(registrationSuccess, 
            `Student ${formData.name} registered successfully! ` +
            `Room assigned: ${ROOM_ASSIGNMENTS[formData.amountPaid]}. ` +
            `Student login: ${formData.email} / ${studentPassword}`
        );
        
        // Reset form
        studentForm.reset();
        assignedRoomInput.value = '';
        
        // Update stats
        await loadStats();
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed: ';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage += 'A student with this email already exists.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage += 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage += 'Password is too weak.';
        } else {
            errorMessage += error.message;
        }
        
        showError(registrationError, errorMessage);
    } finally {
        // Re-enable submit button
        const submitBtn = studentForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Register Student';
    }
}

function getFormData() {
    return {
        name: document.getElementById('studentName').value.trim(),
        email: document.getElementById('studentEmail').value.trim(),
        phone: document.getElementById('studentPhone').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        amountPaid: document.getElementById('amountPaid').value,
        documents: document.getElementById('documents').files
    };
}

function validateForm(data) {
    const errors = [];
    
    if (!data.name) errors.push('Name is required');
    if (!data.email) errors.push('Email is required');
    if (!data.phone) errors.push('Phone is required');
    if (!data.birthDate) errors.push('Birth date is required');
    if (!data.amountPaid) errors.push('Amount paid is required');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
        errors.push('Invalid email format');
    }
    
    // Validate phone format (Indian)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (data.phone && !phoneRegex.test(data.phone)) {
        errors.push('Invalid phone number (should be 10 digits starting with 6-9)');
    }
    
    // Validate birth date (should be at least 16 years old)
    if (data.birthDate) {
        const birthDate = new Date(data.birthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 16) {
            errors.push('Student must be at least 16 years old');
        }
    }
    
    if (errors.length > 0) {
        showError(document.getElementById('registrationError'), errors.join('<br>'));
        return false;
    }
    
    return true;
}

function generatePasswordFromBirthdate(birthDate) {
    // Convert birthdate to password format: ddmmyyyy
    const date = new Date(birthDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}${month}${year}`;
}

async function uploadDocuments(files, studentEmail) {
    const uploadPromises = [];
    const documentUrls = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `documents/${studentEmail}/${fileName}`;
        
        const uploadTask = storage.ref(filePath).put(file);
        uploadPromises.push(uploadTask);
    }
    
    const snapshots = await Promise.all(uploadPromises);
    
    for (const snapshot of snapshots) {
        const downloadUrl = await snapshot.ref.getDownloadURL();
        documentUrls.push({
            name: snapshot.ref.name,
            url: downloadUrl,
            path: snapshot.ref.fullPath
        });
    }
    
    return documentUrls;
}

function updateRoomAssignment() {
    const amount = parseInt(amountPaidSelect.value);
    if (amount && ROOM_ASSIGNMENTS[amount]) {
        assignedRoomInput.value = ROOM_ASSIGNMENTS[amount];
    } else {
        assignedRoomInput.value = '';
    }
}

async function loadStats() {
    try {
        console.log('Loading registration stats from Realtime Database...');
        
        const studentsSnapshot = await database.ref('students').once('value');
        const studentsData = studentsSnapshot.val();
        
        registrationStats = {
            total: 0,
            aBlock: 0,
            eBlockNonAC: 0,
            eBlockAC: 0,
            eNewFloor: 0
        };
        
        if (studentsData) {
            Object.keys(studentsData).forEach(studentId => {
                const data = studentsData[studentId];
                registrationStats.total++;
                
                switch (data.amountPaid) {
                    case 89000:
                        registrationStats.aBlock++;
                        break;
                    case 92000:
                        registrationStats.eBlockNonAC++;
                        break;
                    case 115000:
                        registrationStats.eBlockAC++;
                        break;
                    case 135000:
                        registrationStats.eNewFloor++;
                        break;
                }
            });
        }
        
        updateStatsDisplay();
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function updateStatsDisplay() {
    document.getElementById('totalRegistrations').textContent = registrationStats.total;
    document.getElementById('aBlockCount').textContent = registrationStats.aBlock;
    document.getElementById('eBlockNonACCount').textContent = registrationStats.eBlockNonAC;
    document.getElementById('eBlockACCount').textContent = registrationStats.eBlockAC;
    document.getElementById('eNewFloorCount').textContent = registrationStats.eNewFloor;
}

function showError(element, message) {
    element.innerHTML = message;
    element.style.display = 'block';
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showSuccess(element, message) {
    element.innerHTML = message;
    element.style.display = 'block';
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearMessages() {
    const errorElements = document.querySelectorAll('.alert-danger');
    const successElements = document.querySelectorAll('.alert-success');
    
    errorElements.forEach(el => el.style.display = 'none');
    successElements.forEach(el => el.style.display = 'none');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        isAdminLoggedIn = false;
        sessionStorage.removeItem('adminLoggedIn');
        console.log('Admin logged out');
        showLoginSection();
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN');
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generatePasswordFromBirthdate,
        validateForm,
        ROOM_ASSIGNMENTS
    };
}
