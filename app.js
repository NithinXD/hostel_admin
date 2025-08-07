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
        loadPendingBookings();
        loadApprovedStudents();
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
        loadPendingBookings();
        loadApprovedStudents();
        
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
        await loadPendingBookings();
        await loadApprovedStudents();
        
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
    document.getElementById('totalRegistrations').textContent = registrationStats.approved;
    document.getElementById('aBlockCount').textContent = registrationStats.aBlock;
    document.getElementById('eBlockNonACCount').textContent = registrationStats.eBlockNonAC;
    document.getElementById('eBlockACCount').textContent = registrationStats.eBlockAC;
    document.getElementById('eNewFloorCount').textContent = registrationStats.eNewFloor;
    
    // Update pending count badge
    const pendingCountBadge = document.getElementById('pendingCount');
    if (pendingCountBadge) {
        pendingCountBadge.textContent = registrationStats.pending;
        pendingCountBadge.className = registrationStats.pending > 0 
            ? 'badge bg-warning text-dark ms-1' 
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

async function loadPendingBookings() {
    try {
        console.log('Loading pending bookings...');
        
        const bookingsSnapshot = await database.ref('students').orderByChild('status').equalTo('pending').once('value');
        const bookingsData = bookingsSnapshot.val();
        
        displayPendingBookings(bookingsData);
        
    } catch (error) {
        console.error('Error loading pending bookings:', error);
        showBookingsError('Failed to load pending bookings');
    }
}

async function loadApprovedStudents() {
    try {
        console.log('Loading approved students...');
        
        // Get students with 'approved' status or without status (legacy records)
        const studentsSnapshot = await database.ref('students').once('value');
        const studentsData = studentsSnapshot.val();
        
        const approvedStudents = {};
        if (studentsData) {
            Object.keys(studentsData).forEach(key => {
                const student = studentsData[key];
                if (student.status === 'approved' || !student.status) {
                    approvedStudents[key] = student;
                }
            });
        }
        
        displayApprovedStudents(approvedStudents);
        
    } catch (error) {
        console.error('Error loading approved students:', error);
        showApprovedError('Failed to load approved students');
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
            </div>
        `;
        return;
    }
    
    let bookingsHtml = '';
    
    Object.keys(bookingsData).forEach(studentId => {
        const booking = bookingsData[studentId];
        const registrationDate = booking.registeredAt ? new Date(booking.registeredAt).toLocaleDateString('en-IN') : 'N/A';
        const roomType = ROOM_ASSIGNMENTS[booking.amountPaid] || 'Unknown';
        
        bookingsHtml += `
            <div class="booking-card card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-user me-2"></i>${booking.name}
                        </h5>
                        <span class="booking-status pending">
                            <i class="fas fa-clock me-1"></i>Pending
                        </span>
                    </div>
                    
                    <div class="booking-info">
                        <div class="booking-info-item">
                            <span class="booking-info-label">Email</span>
                            <span class="booking-info-value">${booking.email}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Phone</span>
                            <span class="booking-info-value">${booking.phone}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Birth Date</span>
                            <span class="booking-info-value">${formatDate(booking.birthDate)}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Amount Paid</span>
                            <span class="booking-info-value">${formatCurrency(booking.amountPaid)}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Room Type</span>
                            <span class="booking-info-value">${roomType}</span>
                        </div>
                        <div class="booking-info-item">
                            <span class="booking-info-label">Applied On</span>
                            <span class="booking-info-value">${registrationDate}</span>
                        </div>
                    </div>
                    
                    ${booking.documents && booking.documents.length > 0 ? `
                        <div class="mt-3">
                            <span class="booking-info-label">Documents:</span>
                            <div class="document-list">
                                ${booking.documents.map(doc => `
                                    <a href="${doc.url}" target="_blank" class="document-item">
                                        <i class="fas fa-file-alt"></i>
                                        ${doc.name}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="booking-actions">
                        <button class="btn btn-approve btn-sm" onclick="approveBooking('${studentId}', '${booking.email}', '${booking.birthDate}')">
                            <i class="fas fa-check me-1"></i>Approve
                        </button>
                        <button class="btn btn-reject btn-sm" onclick="rejectBooking('${studentId}')">
                            <i class="fas fa-times me-1"></i>Reject
                        </button>
                        ${booking.documents && booking.documents.length > 0 ? `
                            <button class="btn btn-view-docs btn-sm" onclick="viewDocuments('${studentId}')">
                                <i class="fas fa-eye me-1"></i>View Documents
                            </button>
                        ` : ''}
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
        // Get the student data first
        const studentSnapshot = await database.ref('students/' + studentId).once('value');
        const studentData = studentSnapshot.val();
        
        if (!studentData) {
            throw new Error('Student data not found');
        }
        
        // Create student account in Firebase Auth
        const studentPassword = generatePasswordFromBirthdate(birthDate);
        const studentCredential = await auth.createUserWithEmailAndPassword(email, studentPassword);
        const newStudentUid = studentCredential.user.uid;
        
        // Update student data with approval info
        const updatedData = {
            ...studentData,
            uid: newStudentUid,
            status: 'approved',
            approvedAt: firebase.database.ServerValue.TIMESTAMP,
            approvedBy: ADMIN_EMAIL,
            roomAssignment: ROOM_ASSIGNMENTS[studentData.amountPaid]
        };
        
        // Move student to approved list and remove from pending
        await database.ref('students/' + newStudentUid).set(updatedData);
        await database.ref('students/' + studentId).remove();
        
        console.log('Booking approved successfully');
        
        // Refresh the displays
        await loadPendingBookings();
        await loadApprovedStudents();
        await loadStats();
        
        // Show success message
        showGlobalSuccess(`Booking approved! Student login: ${email} / ${studentPassword}`);
        
    } catch (error) {
        console.error('Error approving booking:', error);
        
        let errorMessage = 'Failed to approve booking: ';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage += 'A student with this email already exists.';
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
        await loadPendingBookings();
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
