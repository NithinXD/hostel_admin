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
    eNewFloor: 0,
    pending: 0,
    approved: 0,
    rejected: 0
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
        loadAllBookings();
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
    
    // Status filter change
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'statusFilter') {
            loadAllBookings();
        }
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
        loadAllBookings();
        
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
            status: 'approved', // Direct registration by admin is auto-approved
            registeredAt: firebase.database.ServerValue.TIMESTAMP,
            registeredBy: ADMIN_EMAIL,
            approvedAt: firebase.database.ServerValue.TIMESTAMP,
            approvedBy: ADMIN_EMAIL
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
        await loadAllBookings();
        
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
            eNewFloor: 0,
            pending: 0,
            approved: 0,
            rejected: 0
        };
        
        if (studentsData) {
            Object.keys(studentsData).forEach(studentId => {
                const data = studentsData[studentId];
                registrationStats.total++;
                
                // Count by status
                switch (data.status) {
                    case 'pending':
                        registrationStats.pending++;
                        break;
                    case 'approved':
                        registrationStats.approved++;
                        break;
                    case 'rejected':
                        registrationStats.rejected++;
                        break;
                    default:
                        registrationStats.approved++; // Assume old records without status are approved
                }
                
                // Count by room type (only for approved students)
                if (data.status === 'approved' || !data.status) {
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
    document.getElementById('pendingStats').textContent = registrationStats.pending;
    document.getElementById('approvedStats').textContent = registrationStats.approved;
    document.getElementById('rejectedStats').textContent = registrationStats.rejected;
    
    // Update badge counts in the tab
    const pendingBadge = document.getElementById('pendingCount');
    const rejectedBadge = document.getElementById('rejectedCount');
    const approvedBadge = document.getElementById('approvedCount');
    
    if (pendingBadge) {
        pendingBadge.textContent = registrationStats.pending;
        pendingBadge.className = registrationStats.pending > 0 
            ? 'badge bg-warning text-dark ms-1' 
            : 'badge bg-secondary ms-1';
    }
    
    if (rejectedBadge) {
        rejectedBadge.textContent = registrationStats.rejected;
        rejectedBadge.className = registrationStats.rejected > 0 
            ? 'badge bg-danger ms-1' 
            : 'badge bg-secondary ms-1';
    }
    
    if (approvedBadge) {
        approvedBadge.textContent = registrationStats.approved;
        approvedBadge.className = registrationStats.approved > 0 
            ? 'badge bg-success ms-1' 
            : 'badge bg-secondary ms-1';
    }
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

// Booking Management Functions

async function loadAllBookings() {
    try {
        console.log('Loading all bookings from Firebase...');
        
        // Get all students data
        const studentsSnapshot = await database.ref('students').once('value');
        const studentsData = studentsSnapshot.val();
        
        console.log('All students data:', studentsData);
        
        if (!studentsData) {
            displayAllBookings(null);
            return;
        }
        
        // Convert to array and sort by status priority: pending, rejected, approved, undefined
        const studentsArray = Object.keys(studentsData).map(key => ({
            id: key,
            ...studentsData[key]
        }));
        
        // Sort by status priority
        const statusOrder = { 'pending': 1, 'rejected': 2, 'approved': 3, undefined: 4 };
        studentsArray.sort((a, b) => {
            const statusA = statusOrder[a.status] || statusOrder[undefined];
            const statusB = statusOrder[b.status] || statusOrder[undefined];
            return statusA - statusB;
        });
        
        console.log('Sorted students array:', studentsArray);
        displayAllBookings(studentsArray);
        
    } catch (error) {
        console.error('Error loading all bookings:', error);
        showAllBookingsError('Failed to load bookings: ' + error.message);
    }
}

function displayAllBookings(studentsArray) {
    const container = document.getElementById('allBookingsContainer');
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    
    if (!studentsArray || studentsArray.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h5>No Students Found</h5>
                <p>No student data available in the database.</p>
            </div>
        `;
        return;
    }
    
    // Filter by status if needed
    let filteredStudents = studentsArray;
    if (statusFilter !== 'all') {
        filteredStudents = studentsArray.filter(student => {
            if (statusFilter === 'undefined') {
                return !student.status;
            }
            return student.status === statusFilter;
        });
    }
    
    if (filteredStudents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h5>No Students Match Filter</h5>
                <p>No students found with status: ${statusFilter}</p>
                <button class="btn btn-primary mt-2" onclick="document.getElementById('statusFilter').value='all'; loadAllBookings();">
                    Show All Students
                </button>
            </div>
        `;
        return;
    }
    
    let bookingsHtml = '';
    
    filteredStudents.forEach(student => {
        const status = student.status || 'undefined';
        const statusClass = getStatusClass(status);
        const statusIcon = getStatusIcon(status);
        const statusText = getStatusText(status);
        
        // Handle different timestamp formats
        let registrationDate = 'N/A';
        if (student.registeredAt) {
            registrationDate = new Date(student.registeredAt).toLocaleDateString('en-IN');
        } else if (student.timestamp) {
            registrationDate = new Date(student.timestamp).toLocaleDateString('en-IN');
        }
        
        // Get room type
        let roomType = 'Unknown';
        if (student.roomAssignment) {
            roomType = student.roomAssignment;
        } else if (student.booking && student.booking.block && student.booking.floor) {
            roomType = `${student.booking.block} - ${student.booking.floor}`;
        } else if (student.amountPaid && ROOM_ASSIGNMENTS[student.amountPaid]) {
            roomType = ROOM_ASSIGNMENTS[student.amountPaid];
        }
        
        const amount = student.amountPaid || 0;
        
        bookingsHtml += `
            <div class="booking-card card mb-3 ${statusClass}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-user me-2"></i>${student.name || 'N/A'}
                        </h5>
                        <span class="booking-status ${status}">
                            <i class="${statusIcon} me-1"></i>${statusText}
                        </span>
                    </div>
                    
                    <div class="booking-info">
                        <div class="booking-info-item">
                            <span class="booking-info-label">Email</span>
                            <span class="booking-info-value">${student.email || 'N/A'}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Phone</span>
                            <span class="booking-info-value">${student.phone || 'N/A'}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Birth Date</span>
                            <span class="booking-info-value">${student.birthDate ? formatDate(student.birthDate) : 'N/A'}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Amount Paid</span>
                            <span class="booking-info-value">${amount > 0 ? formatCurrency(amount) : 'N/A'}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Room Type</span>
                            <span class="booking-info-value">${roomType}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Applied On</span>
                            <span class="booking-info-value">${registrationDate}</span>
                        </div>
                        ${student.booking && student.booking.occupancy ? `
                        <div class="booking-info-item">
                            <span class="booking-info-label">Occupancy</span>
                            <span class="booking-info-value">${student.booking.occupancy} person(s)</span>
                        </div>
                        ` : ''}
                        ${student.booking && student.booking.rooms ? `
                        <div class="booking-info-item">
                            <span class="booking-info-label">Room Number</span>
                            <span class="booking-info-value">${Object.values(student.booking.rooms).join(', ')}</span>
                        </div>
                        ` : ''}
                        ${student.approvedAt ? `
                        <div class="booking-info-item">
                            <span class="booking-info-label">Approved On</span>
                            <span class="booking-info-value">${new Date(student.approvedAt).toLocaleDateString('en-IN')}</span>
                        </div>
                        ` : ''}
                        ${student.rejectedAt ? `
                        <div class="booking-info-item">
                            <span class="booking-info-label">Rejected On</span>
                            <span class="booking-info-value">${new Date(student.rejectedAt).toLocaleDateString('en-IN')}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="booking-actions">
                        ${status === 'pending' || !student.status ? `
                            <button class="btn btn-approve btn-sm" onclick="approveBooking('${student.id}', '${student.email || ''}', '${student.birthDate || ''}')">
                                <i class="fas fa-check me-1"></i>Approve
                            </button>
                            <button class="btn btn-reject btn-sm" onclick="rejectBooking('${student.id}')">
                                <i class="fas fa-times me-1"></i>Reject
                            </button>
                        ` : ''}
                        ${status === 'rejected' ? `
                            <button class="btn btn-approve btn-sm" onclick="approveBooking('${student.id}', '${student.email || ''}', '${student.birthDate || ''}')">
                                <i class="fas fa-undo me-1"></i>Re-approve
                            </button>
                        ` : ''}
                        ${status === 'approved' ? `
                            <button class="btn btn-reject btn-sm" onclick="rejectBooking('${student.id}')">
                                <i class="fas fa-ban me-1"></i>Revoke
                            </button>
                        ` : ''}
                        <button class="btn btn-info btn-sm" onclick="viewStudentDetails('${student.id}')">
                            <i class="fas fa-eye me-1"></i>Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = bookingsHtml;
}

function getStatusClass(status) {
    switch (status) {
        case 'pending': return 'border-warning';
        case 'approved': return 'border-success';
        case 'rejected': return 'border-danger';
        default: return 'border-secondary';
    }
}

function getStatusIcon(status) {
    switch (status) {
        case 'pending': return 'fas fa-clock';
        case 'approved': return 'fas fa-check-circle';
        case 'rejected': return 'fas fa-times-circle';
        default: return 'fas fa-question-circle';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'Pending';
        case 'approved': return 'Approved';
        case 'rejected': return 'Rejected';
        default: return 'No Status';
    }
}

async function refreshAllBookings() {
    await loadAllBookings();
    showGlobalSuccess('Bookings refreshed successfully!');
}

function showAllBookingsError(message) {
    document.getElementById('allBookingsContainer').innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
        </div>
    `;
}

function viewStudentDetails(studentId) {
    // For now, just log the student details
    console.log('Viewing details for student:', studentId);
    // Could implement a modal or detailed view here
}

async function loadPendingBookings() {
    try {
        console.log('Loading pending bookings from Firebase...');
        
        // First, let's see all students data to debug
        const allStudentsSnapshot = await database.ref('students').once('value');
        const allStudentsData = allStudentsSnapshot.val();
        console.log('All students data in Firebase:', allStudentsData);
        
        // Query for students with "pending" status
        const bookingsSnapshot = await database.ref('students').orderByChild('status').equalTo('pending').once('value');
        const bookingsData = bookingsSnapshot.val();
        
        console.log('Pending bookings data:', bookingsData);
        console.log('Number of pending bookings found:', bookingsData ? Object.keys(bookingsData).length : 0);
        
        // If no pending bookings found, let's see what statuses exist
        if (!bookingsData || Object.keys(bookingsData).length === 0) {
            console.log('No pending bookings found. Checking all student statuses...');
            if (allStudentsData) {
                Object.keys(allStudentsData).forEach(studentId => {
                    const student = allStudentsData[studentId];
                    console.log(`Student ${studentId}: status = "${student.status || 'undefined'}", name = "${student.name || 'undefined'}"`);
                });
            }
        }
        
        displayPendingBookings(bookingsData);
        
    } catch (error) {
        console.error('Error loading pending bookings:', error);
        showBookingsError('Failed to load pending bookings: ' + error.message);
    }
}

async function loadApprovedStudents() {
    try {
        console.log('Loading approved students from Firebase...');
        
        // Get all students and filter for approved ones
        const studentsSnapshot = await database.ref('students').once('value');
        const studentsData = studentsSnapshot.val();
        
        const approvedStudents = {};
        if (studentsData) {
            Object.keys(studentsData).forEach(key => {
                const student = studentsData[key];
                // Include students with 'approved' status or without status (legacy records)
                if (student.status === 'approved' || !student.status) {
                    approvedStudents[key] = student;
                }
            });
        }
        
        console.log('Approved students data:', approvedStudents);
        displayApprovedStudents(approvedStudents);
        
    } catch (error) {
        console.error('Error loading approved students:', error);
        showApprovedError('Failed to load approved students: ' + error.message);
    }
}

function displayPendingBookings(bookingsData) {
    const container = document.getElementById('pendingBookingsContainer');
    
    if (!bookingsData || Object.keys(bookingsData).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-check"></i>
                <h5>No Pending Bookings</h5>
                <p>All bookings have been processed. Great work!</p>
                <div class="mt-3">
                    <small class="text-muted">
                        <strong>Troubleshooting:</strong><br>
                        • Use the "Debug" button to check Firebase data<br>
                        • Use "Test Booking" to create a sample pending booking<br>
                        • Use "Make Pending" to set an existing student to pending status
                    </small>
                </div>
            </div>
        `;
        return;
    }
    
    let bookingsHtml = '';
    
    Object.keys(bookingsData).forEach(studentId => {
        const booking = bookingsData[studentId];
        
        // Handle different timestamp formats
        let registrationDate = 'N/A';
        if (booking.registeredAt) {
            registrationDate = new Date(booking.registeredAt).toLocaleDateString('en-IN');
        } else if (booking.timestamp) {
            registrationDate = new Date(booking.timestamp).toLocaleDateString('en-IN');
        }
        
        // Get room type based on booking structure or amount
        let roomType = 'Unknown';
        if (booking.roomAssignment) {
            roomType = booking.roomAssignment;
        } else if (booking.booking && booking.booking.block && booking.booking.floor) {
            roomType = `${booking.booking.block} - ${booking.booking.floor}`;
        } else if (booking.amountPaid && ROOM_ASSIGNMENTS[booking.amountPaid]) {
            roomType = ROOM_ASSIGNMENTS[booking.amountPaid];
        }
        
        // Format amount
        const amount = booking.amountPaid || 0;
        
        bookingsHtml += `
            <div class="booking-card card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-user me-2"></i>${booking.name || 'N/A'}
                        </h5>
                        <span class="booking-status pending">
                            <i class="fas fa-clock me-1"></i>Pending
                        </span>
                    </div>
                    
                    <div class="booking-info">
                        <div class="booking-info-item">
                            <span class="booking-info-label">Email</span>
                            <span class="booking-info-value">${booking.email || 'N/A'}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Phone</span>
                            <span class="booking-info-value">${booking.phone || 'N/A'}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Birth Date</span>
                            <span class="booking-info-value">${booking.birthDate ? formatDate(booking.birthDate) : 'N/A'}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Amount Paid</span>
                            <span class="booking-info-value">${amount > 0 ? formatCurrency(amount) : 'N/A'}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Room Type</span>
                            <span class="booking-info-value">${roomType}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Applied On</span>
                            <span class="booking-info-value">${registrationDate}</span>
                        </div>
                        ${booking.booking && booking.booking.occupancy ? `
                        <div class="booking-info-item">
                            <span class="booking-info-label">Occupancy</span>
                            <span class="booking-info-value">${booking.booking.occupancy} person(s)</span>
                        </div>
                        ` : ''}
                        ${booking.booking && booking.booking.rooms ? `
                        <div class="booking-info-item">
                            <span class="booking-info-label">Room Number</span>
                            <span class="booking-info-value">${Object.values(booking.booking.rooms).join(', ')}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="booking-actions">
                        <button class="btn btn-approve btn-sm" onclick="approveBooking('${studentId}', '${booking.email || ''}', '${booking.birthDate || ''}')">
                            <i class="fas fa-check me-1"></i>Approve
                        </button>
                        <button class="btn btn-reject btn-sm" onclick="rejectBooking('${studentId}')">
                            <i class="fas fa-times me-1"></i>Reject
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = bookingsHtml;
}

function displayApprovedStudents(studentsData) {
    const container = document.getElementById('approvedStudentsContainer');
    
    if (!studentsData || Object.keys(studentsData).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-check"></i>
                <h5>No Approved Students</h5>
                <p>No students have been approved yet.</p>
            </div>
        `;
        return;
    }
    
    let studentsHtml = '';
    
    Object.keys(studentsData).forEach(studentId => {
        const student = studentsData[studentId];
        const registrationDate = student.registeredAt ? new Date(student.registeredAt).toLocaleDateString('en-IN') : 'N/A';
        const approvalDate = student.approvedAt ? new Date(student.approvedAt).toLocaleDateString('en-IN') : 'N/A';
        const roomType = ROOM_ASSIGNMENTS[student.amountPaid] || 'Unknown';
        
        studentsHtml += `
            <div class="booking-card card mb-3 approved">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-user-check me-2"></i>${student.name}
                        </h5>
                        <span class="booking-status approved">
                            <i class="fas fa-check-circle me-1"></i>Approved
                        </span>
                    </div>
                    
                    <div class="booking-info">
                        <div class="booking-info-item">
                            <span class="booking-info-label">Email</span>
                            <span class="booking-info-value">${student.email}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Phone</span>
                            <span class="booking-info-value">${student.phone}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Room Assignment</span>
                            <span class="booking-info-value">${student.roomAssignment || roomType}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Amount Paid</span>
                            <span class="booking-info-value">${formatCurrency(student.amountPaid)}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Approved On</span>
                            <span class="booking-info-value">${approvalDate}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Approved By</span>
                            <span class="booking-info-value">${student.approvedBy || student.registeredBy || 'System'}</span>
                        </div>
                    </div>
                    
                    ${student.documents && student.documents.length > 0 ? `
                        <div class="mt-3">
                            <span class="booking-info-label">Documents:</span>
                            <div class="document-list">
                                ${student.documents.map(doc => `
                                    <a href="${doc.url}" target="_blank" class="document-item">
                                        <i class="fas fa-file-alt"></i>
                                        ${doc.name}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = studentsHtml;
}

async function approveBooking(studentId, email, birthDate) {
    if (!confirm('Are you sure you want to approve this booking?')) {
        return;
    }
    
    try {
        console.log('Approving booking for student:', studentId);
        
        // Get the student data first
        const studentSnapshot = await database.ref('students/' + studentId).once('value');
        const studentData = studentSnapshot.val();
        
        if (!studentData) {
            throw new Error('Student data not found');
        }
        
        // If student doesn't have email/birthDate in the main data, use the passed parameters
        const studentEmail = studentData.email || email;
        const studentBirthDate = studentData.birthDate || birthDate;
        
        if (!studentEmail || !studentBirthDate) {
            throw new Error('Student email or birth date is missing');
        }
        
        // Check if this student already has a Firebase Auth account
        let studentUid = studentData.uid;
        
        // If no UID exists, create a new Firebase Auth account
        if (!studentUid) {
            const studentPassword = generatePasswordFromBirthdate(studentBirthDate);
            const studentCredential = await auth.createUserWithEmailAndPassword(studentEmail, studentPassword);
            studentUid = studentCredential.user.uid;
            console.log('Created new Firebase Auth account for student');
        }
        
        // Determine room assignment
        let roomAssignment = studentData.roomAssignment;
        if (!roomAssignment && studentData.amountPaid && ROOM_ASSIGNMENTS[studentData.amountPaid]) {
            roomAssignment = ROOM_ASSIGNMENTS[studentData.amountPaid];
        } else if (!roomAssignment && studentData.booking) {
            roomAssignment = `${studentData.booking.block || ''} - ${studentData.booking.floor || ''}`.trim();
        }
        
        // Update student data with approval info
        const updatedData = {
            ...studentData,
            uid: studentUid,
            status: 'approved',
            approvedAt: firebase.database.ServerValue.TIMESTAMP,
            approvedBy: ADMIN_EMAIL,
            roomAssignment: roomAssignment || 'To be assigned'
        };
        
        // Update the existing record
        await database.ref('students/' + studentId).set(updatedData);
        
        console.log('Booking approved successfully');
        
        // Refresh the displays
        await loadAllBookings();
        await loadStats();
        
        // Show success message
        const password = generatePasswordFromBirthdate(studentBirthDate);
        showGlobalSuccess(`Booking approved! Student login: ${studentEmail} / ${password}`);
        
    } catch (error) {
        console.error('Error approving booking:', error);
        
        let errorMessage = 'Failed to approve booking: ';
        if (error.code === 'auth/email-already-in-use') {
            // If email already exists, just update the status without creating new auth account
            try {
                const studentSnapshot = await database.ref('students/' + studentId).once('value');
                const studentData = studentSnapshot.val();
                
                const updatedData = {
                    ...studentData,
                    status: 'approved',
                    approvedAt: firebase.database.ServerValue.TIMESTAMP,
                    approvedBy: ADMIN_EMAIL,
                    roomAssignment: studentData.roomAssignment || ROOM_ASSIGNMENTS[studentData.amountPaid] || 'To be assigned'
                };
                
                await database.ref('students/' + studentId).set(updatedData);
                
                // Refresh displays
                await loadAllBookings();
                await loadStats();
                
                showGlobalSuccess('Booking approved! (Student account already exists)');
                return;
            } catch (updateError) {
                errorMessage += 'Student account exists but failed to update status.';
            }
        } else {
            errorMessage += error.message;
        }
        
        showGlobalError(errorMessage);
    }
}

async function rejectBooking(studentId) {
    const reason = prompt('Please provide a reason for rejection (optional):');
    
    if (!confirm('Are you sure you want to reject this booking?')) {
        return;
    }
    
    try {
        // Update student status to rejected
        await database.ref('students/' + studentId).update({
            status: 'rejected',
            rejectedAt: firebase.database.ServerValue.TIMESTAMP,
            rejectedBy: ADMIN_EMAIL,
            rejectionReason: reason || 'No reason provided'
        });
        
        console.log('Booking rejected successfully');
        
        // Refresh the displays
        await loadAllBookings();
        await loadStats();
        
        showGlobalSuccess('Booking rejected successfully');
        
    } catch (error) {
        console.error('Error rejecting booking:', error);
        showGlobalError('Failed to reject booking: ' + error.message);
    }
}

function viewDocuments(studentId) {
    // This could open a modal or new window to view documents
    // For now, we'll just scroll to the documents section
    const bookingCard = document.querySelector(`[onclick*="${studentId}"]`).closest('.booking-card');
    const documentsSection = bookingCard.querySelector('.document-list');
    
    if (documentsSection) {
        documentsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        documentsSection.style.backgroundColor = '#fff3cd';
        setTimeout(() => {
            documentsSection.style.backgroundColor = '';
        }, 2000);
    }
}

function showBookingsError(message) {
    document.getElementById('pendingBookingsContainer').innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
        </div>
    `;
}

function showApprovedError(message) {
    document.getElementById('approvedStudentsContainer').innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
        </div>
    `;
}

function showGlobalSuccess(message) {
    // Create a temporary success alert at the top of the page
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

function showGlobalError(message) {
    // Create a temporary error alert at the top of the page
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Debug Functions
async function debugFirebaseData() {
    try {
        console.log('=== DEBUG: Firebase Data ===');
        const snapshot = await database.ref('students').once('value');
        const data = snapshot.val();
        
        if (!data) {
            console.log('No students data found in Firebase');
            showGlobalError('No students data found in Firebase database');
            return;
        }
        
        console.log('Full Firebase data:', data);
        
        // Analyze the data structure
        const students = Object.keys(data);
        console.log(`Found ${students.length} students in database`);
        
        students.forEach(studentId => {
            const student = data[studentId];
            console.log(`Student ${studentId}:`, {
                name: student.name,
                email: student.email,
                status: student.status || 'NO STATUS',
                amountPaid: student.amountPaid,
                hasBooking: !!student.booking
            });
        });
        
        // Count by status
        const statusCounts = {};
        students.forEach(studentId => {
            const status = data[studentId].status || 'undefined';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        console.log('Status counts:', statusCounts);
        showGlobalSuccess(`Debug complete. Found ${students.length} students. Check console for details.`);
        
    } catch (error) {
        console.error('Debug error:', error);
        showGlobalError('Debug failed: ' + error.message);
    }
}

async function createTestPendingBooking() {
    try {
        const testBooking = {
            name: "Test Student",
            email: "test.student@example.com",
            phone: "9876543210",
            birthDate: "2005-01-01",
            amountPaid: 89000,
            status: "pending",
            registeredAt: Date.now(),
            booking: {
                block: "Block A",
                floor: "Ground Floor",
                occupancy: 1
            }
        };
        
        const newBookingRef = database.ref('students').push();
        await newBookingRef.set(testBooking);
        
        console.log('Test pending booking created:', newBookingRef.key);
        
        // Refresh the display
        await loadPendingBookings();
        await loadStats();
        
        showGlobalSuccess('Test pending booking created successfully!');
        
    } catch (error) {
        console.error('Error creating test booking:', error);
        showGlobalError('Failed to create test booking: ' + error.message);
    }
}

async function setStudentStatusToPending(studentId) {
    try {
        if (!studentId) {
            // Get the first student and set their status to pending
            const snapshot = await database.ref('students').limitToFirst(1).once('value');
            const data = snapshot.val();
            
            if (!data) {
                showGlobalError('No students found in database');
                return;
            }
            
            studentId = Object.keys(data)[0];
        }
        
        await database.ref('students/' + studentId).update({
            status: 'pending'
        });
        
        console.log(`Set student ${studentId} status to pending`);
        
        // Refresh displays
        await loadAllBookings();
        await loadStats();
        
        showGlobalSuccess(`Student ${studentId} status set to pending`);
        
    } catch (error) {
        console.error('Error setting status to pending:', error);
        showGlobalError('Failed to set status: ' + error.message);
    }
}
