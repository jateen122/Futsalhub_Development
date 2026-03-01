import { useState, useEffect } from "react";

const BASE_URL = "http://127.0.0.1:8000";

export default function AddGround() {
  const token = localStorage.getItem("access");

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    price_per_hour: "",
    opening_time: "",
    closing_time: "",
    facilities: "",
    image: null,
  });

  const [myGround, setMyGround] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState("");

  // 🔥 Load Owner Ground
  useEffect(() => {
    const fetchGround = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/grounds/my/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (data.results && data.results.length > 0) {
          setMyGround(data.results[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchGround();
  }, [token]);

  // 🔥 Handle Input Change
  const handleChange = (e) => {
    if (e.target.name === "image") {
      const file = e.target.files[0];
      setFormData({ ...formData, image: file });

      if (file) {
        setPreview(URL.createObjectURL(file));
      }
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  // 🔥 Create Ground
  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key]) data.append(key, formData[key]);
    });

    const res = await fetch(`${BASE_URL}/api/grounds/create/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });

    const result = await res.json();

    if (res.ok) {
      setMessage("Ground created successfully ✅");
      setMyGround(result);
      setPreview(null);
    } else {
      setMessage("Error creating ground ❌");
    }
  };

  // 🔥 Update Ground
  const handleUpdate = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key]) data.append(key, formData[key]);
    });

    const res = await fetch(
      `${BASE_URL}/api/grounds/${myGround.id}/update/`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      }
    );

    const result = await res.json();

    if (res.ok) {
      setMessage("Ground updated successfully ✅");
      setMyGround(result);
      setEditMode(false);
      setPreview(null);
    } else {
      setMessage("Update failed ❌");
    }
  };

  // 🔥 Delete Ground
  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this ground?"
    );

    if (!confirmDelete) return;

    const res = await fetch(
      `${BASE_URL}/api/grounds/${myGround.id}/delete/`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok) {
      setMyGround(null);
      setMessage("Ground deleted successfully ✅");
    } else {
      setMessage("Delete failed ❌");
    }
  };

  // 🔥 Enable Edit Mode
  const enableEdit = () => {
    setEditMode(true);
    setFormData({
      name: myGround.name,
      location: myGround.location,
      description: myGround.description,
      price_per_hour: myGround.price_per_hour,
      opening_time: myGround.opening_time,
      closing_time: myGround.closing_time,
      facilities: myGround.facilities,
      image: null,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-black via-blue-900 to-black pt-24 px-6 text-white">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10">

        {/* LEFT FORM */}
        <div className="bg-white text-black p-8 rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {editMode ? "Edit Ground ✏️" : "Add New Ground 🏟"}
          </h2>

          {message && (
            <p className="text-center text-green-600 mb-4">{message}</p>
          )}

          {(!myGround || editMode) && (
            <form
              onSubmit={editMode ? handleUpdate : handleSubmit}
              className="space-y-4"
            >
              <input type="text" name="name" placeholder="Ground Name"
                value={formData.name} onChange={handleChange}
                className="w-full p-2 border rounded" required />

              <input type="text" name="location" placeholder="Location"
                value={formData.location} onChange={handleChange}
                className="w-full p-2 border rounded" required />

              <textarea name="description" placeholder="Description"
                value={formData.description} onChange={handleChange}
                className="w-full p-2 border rounded" />

              <input type="number" name="price_per_hour"
                placeholder="Price per Hour"
                value={formData.price_per_hour}
                onChange={handleChange}
                className="w-full p-2 border rounded" required />

              <div className="flex gap-4">
                <input type="time" name="opening_time"
                  value={formData.opening_time}
                  onChange={handleChange}
                  className="w-full p-2 border rounded" required />

                <input type="time" name="closing_time"
                  value={formData.closing_time}
                  onChange={handleChange}
                  className="w-full p-2 border rounded" required />
              </div>

              <input type="text" name="facilities"
                placeholder="Facilities"
                value={formData.facilities}
                onChange={handleChange}
                className="w-full p-2 border rounded" />

              <input type="file" name="image"
                onChange={handleChange}
                className="w-full" />

              {preview && (
                <img src={preview}
                  alt="preview"
                  className="w-full h-40 object-cover rounded border" />
              )}

              <button className="w-full bg-black text-white py-2 rounded hover:bg-gray-800">
                {editMode ? "Update Ground" : "Add Ground"}
              </button>
            </form>
          )}
        </div>

        {/* RIGHT CARD */}
        {myGround && !editMode && (
          <div className="bg-white text-black p-6 rounded-2xl shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Your Ground</h3>

            {myGround.image && (
              <img
                src={myGround.image}
                alt={myGround.name}
                className="w-full h-56 object-cover rounded-lg mb-4"
              />
            )}

            <div className="space-y-1">
              <p><strong>Name:</strong> {myGround.name}</p>
              <p><strong>Location:</strong> {myGround.location}</p>
              <p><strong>Price:</strong> Rs {myGround.price_per_hour}</p>
              <p><strong>Facilities:</strong> {myGround.facilities}</p>
              <p>
                <strong>Status:</strong>{" "}
                {myGround.is_approved ? "Approved ✅" : "Pending ⏳"}
              </p>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={enableEdit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Edit
              </button>

              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}