document.addEventListener("DOMContentLoaded", function () {

    fetch("../components/navbar.html")   // ✅ CORRECT PATH
        .then(response => {
            if (!response.ok) {
                throw new Error("Navbar not found");
            }
            return response.text();
        })
        .then(data => {
            document.getElementById("navbar").innerHTML = data;
        })
        .catch(error => {
            console.error("Error loading navbar:", error);
        });

});