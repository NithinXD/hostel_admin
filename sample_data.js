// Sample data script to add test bookings
// This script demonstrates how to add pending bookings for testing

// Function to add sample pending booking
async function addSampleBooking() {
    try {
        const sampleBooking = {
            name: "jana",
            email: "jana123@gmail.com",
            phone: "9976678406",
            birthDate: "2008-02-04",
            amountPaid: 89000,
            status: "pending",
            booking: {
                block: "Block A",
                floor: "Ground Floor",
                occupancy: 3,
                rooms: {
                    "0": 15
                }
            },
            registeredAt: Date.now(),
            timestamp: 1754497909783,
            uid: "MpbWJu028kPaurNVaDqnKHEDmMW2"
        };
        
        // Add to Firebase
        const bookingRef = firebase.database().ref('students').push();
        await bookingRef.set(sampleBooking);
        
        console.log('Sample booking added successfully');
        return bookingRef.key;
        
    } catch (error) {
        console.error('Error adding sample booking:', error);
    }
}

// Function to add multiple sample bookings for testing
async function addMultipleSampleBookings() {
    const sampleBookings = [
        {
            name: "Rahul Kumar",
            email: "rahul.kumar@example.com",
            phone: "9876543210",
            birthDate: "2005-03-15",
            amountPaid: 92000,
            status: "pending",
            registeredAt: Date.now() - 86400000, // 1 day ago
        },
        {
            name: "Priya Sharma",
            email: "priya.sharma@example.com",
            phone: "9876543211",
            birthDate: "2004-07-22",
            amountPaid: 115000,
            status: "pending",
            registeredAt: Date.now() - 172800000, // 2 days ago
        },
        {
            name: "Amit Patel",
            email: "amit.patel@example.com",
            phone: "9876543212",
            birthDate: "2003-11-08",
            amountPaid: 135000,
            status: "pending",
            registeredAt: Date.now() - 259200000, // 3 days ago
        }
    ];
    
    try {
        for (const booking of sampleBookings) {
            const bookingRef = firebase.database().ref('students').push();
            await bookingRef.set(booking);
            console.log(`Added sample booking for ${booking.name}`);
        }
        
        console.log('All sample bookings added successfully');
        
        // Refresh the displays if functions are available
        if (typeof loadPendingBookings === 'function') {
            await loadPendingBookings();
        }
        if (typeof loadStats === 'function') {
            await loadStats();
        }
        if (typeof showGlobalSuccess === 'function') {
            showGlobalSuccess('Sample test data added successfully!');
        }
        
    } catch (error) {
        console.error('Error adding sample bookings:', error);
    }
}

// To use these functions, call them from the browser console after the app loads:
// addSampleBooking()
// addMultipleSampleBookings()
