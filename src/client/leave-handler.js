(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const pin = urlParams.get('code') || urlParams.get('pin');
    
    let username = "Guest";
    try {
        const storedInfo = localStorage.getItem('user_info');
        if (storedInfo) {
            username = JSON.parse(storedInfo).username || "Guest";
        }
    } catch(e) {
        username = localStorage.getItem('user_info') || "Guest";
    }

    if (!pin || username === "Guest") return;

    window.isInternalNavigation = false;

    // Provide a helper function for other scripts to use when navigating internally
    window.setInternalNavigation = function() {
        window.isInternalNavigation = true;
    };

    function leaveSession() {
        if (window.isInternalNavigation) return;
        
        const url = `http://localhost:3000/api/session/${pin}/leave`;
        const data = JSON.stringify({ username });
        
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data,
            keepalive: true
        }).catch(e => console.error(e));
    }

    window.addEventListener('pagehide', leaveSession);
    window.addEventListener('beforeunload', leaveSession);

    // Provide manual trigger for UI buttons to ensure they wait for the request
    window.triggerLeaveAndRedirect = function(redirectUrl) {
        if (window.isInternalNavigation) return;
        window.isInternalNavigation = true; // Prevents double firing on unload
        
        fetch(`http://localhost:3000/api/session/${pin}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        }).finally(() => {
            window.location.href = redirectUrl;
        });
    };

})();
