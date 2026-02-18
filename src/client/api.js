async function startNewSession() {
    const response = await fetch('http://localhost:3000/api/sessions/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            hostName: "Kevin", // This would normally come from an input field
            decisionType: "Food"
        })
    });

    const data = await response.json();
    console.log("Room Created! Your code is:", data.roomCode);
    alert("Room Created! Share this code: " + data.roomCode);
}

async function joinExistingSession() {
    const code = prompt("Enter the 6-character Room Code:");
    const name = prompt("Enter your name:");

    if (!code || !name) return alert("Both fields are required!");

    try {
        const response = await fetch('http://localhost:3000/api/sessions/join', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomCode: code.toUpperCase(),
                participantName: name
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Joined Room!", data);
            alert(`Success! You joined ${data.hostName}'s room.\nParticipants: ${data.participants.join(', ')}`);
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Join failed:", error);
    }
}

// TEST REGISTER FUNCTION
async function handleRegister() {
    const user = prompt("Create a Username:");
    const pass = prompt("Create a Password:");

    if (!user || !pass) return;

    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await response.json();
        alert(data.message || data.error);
    } catch (err) {
        console.error("Register failed:", err);
    }
}

// TEST LOGIN FUNCTION
async function handleLogin() {
    const user = prompt("Enter Username:");
    const pass = prompt("Enter Password:");

    try {
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('tiebreaker_token', data.token); // Save the JWT
            alert("Login Success! Redirecting to Dashboard...");
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message);
        }
    } catch (err) {
        console.error("Login failed:", err);
    }
}

function handleLogout() {
    // 1. Remove the token from storage
    localStorage.removeItem('tiebreaker_token');
    
    // 2. Optional: Clear any other user data
    localStorage.removeItem('user_info');
    
    // 3. Send them back to the landing page
    alert("You have been logged out.");
    window.location.href = 'index.html';
}