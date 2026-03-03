async function startParticipantPolling(pin, listElementId, countElementId, isHost = false) {
    const listContainer = document.getElementById(listElementId);
    const countLabel = document.getElementById(countElementId);

    async function checkParticipants() {
        try {
            // 1. Ask the server for the latest list
            const response = await fetch(`http://localhost:3000/api/session/${pin}`);
            const data = await response.json();

            if (data.success) {
                // 2. Update the Count Text
                if (countLabel) {
                    countLabel.innerText = `Participants (${data.users.length})`;
                }

                // 3. Update the List of Names
                if (listContainer) {
                    listContainer.innerHTML = ''; // Wipe the list clean
                    
                    data.users.forEach((user, index) => {
                        const userDiv = document.createElement('div');
                        userDiv.className = 'user-row'; 
                        
                        // The first user is always the Host
                        const isFirstUser = index === 0;
                        
                        userDiv.innerHTML = `
                            <span>${user}</span>
                            ${isFirstUser ? '<span class="host-badge">HOST</span>' : ''}
                        `;
                        listContainer.appendChild(userDiv);
                    });
                }
                
                // 4. (For Host Only) Enable the "Start" button if 2+ people are here
                if (isHost) {
                    const startBtn = document.getElementById('start-session-btn');
                    if (startBtn) {
                        // If users >= 2, disable = false (Enable it!)
                        startBtn.disabled = data.users.length < 2;
                    }
                } 
                // 5. (For Guest Only) If session started, redirect!
                else if (data.status === 'started') {
                    // Redirect to the voting page based on the page type
                    // (We assume the current URL tells us which vote page to go to)
                    if (window.location.href.includes('food')) window.location.href = `votefood.html?code=${pin}`;
                    else if (window.location.href.includes('movie')) window.location.href = `votemovies.html?code=${pin}`;
                    else if (window.location.href.includes('activity')) window.location.href = `voteactivities.html?code=${pin}`;
                    // Fallback for generic join pages
                    else window.location.href = `votefood.html?code=${pin}`; 
                }
            }
        } catch (err) {
            console.error("Polling error:", err);
        }
    }

    checkParticipants();
    setInterval(checkParticipants, 3000);
}