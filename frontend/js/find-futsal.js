document.addEventListener("DOMContentLoaded", function () {

    const container = document.getElementById("futsalContainer");

    fetch("/api/futsals/")
        .then(response => response.json())
        .then(data => {

            container.innerHTML = ""; // Clear existing content

            data.forEach(futsal => {

                const card = `
                    <div class="col-md-4">
                        <div class="card futsal-card shadow-sm">

                            <img src="${futsal.image}" class="card-img-top">

                            <div class="card-body">
                                <h5>${futsal.name}</h5>
                                <p class="text-muted">Location: ${futsal.location}</p>
                                <p class="price">Rs. ${futsal.price} / Hour</p>

                                <div class="d-flex justify-content-between">
                                    <a href="details.html?id=${futsal.id}" class="btn btn-outline-dark btn-sm">
                                        View Details
                                    </a>
                                    <a href="booking.html?id=${futsal.id}" class="btn btn-danger btn-sm">
                                        Book Now
                                    </a>
                                </div>
                            </div>

                        </div>
                    </div>
                `;

                container.innerHTML += card;

            });

        })
        .catch(error => {
            console.error("Error loading futsals:", error);
        });

});