import { useState, useEffect } from "react";

const BASE_URL = "http://127.0.0.1:8000";

export default function AddGround() {

  const token = localStorage.getItem("access");

  const [formData,setFormData] = useState({
    name:"",
    location:"",
    description:"",
    price_per_hour:"",
    opening_time:"",
    closing_time:"",
    facilities:"",
    image:null
  })

  const [myGround,setMyGround] = useState(null)
  const [preview,setPreview] = useState(null)
  const [editMode,setEditMode] = useState(false)
  const [message,setMessage] = useState("")

  /* ================= FETCH GROUND ================= */

  const fetchMyGround = async () => {

    try{

      const res = await fetch(`${BASE_URL}/api/grounds/my/`,{
        headers:{Authorization:`Bearer ${token}`}
      })

      const data = await res.json()

      if(data.results && data.results.length > 0){

        const ground = data.results[0]

        setMyGround(ground)

        setPreview(
          ground.image
          ? ground.image.startsWith("http")
            ? ground.image
            : `${BASE_URL}${ground.image}`
          : null
        )

      }

    }catch(err){
      console.log(err)
    }

  }

  useEffect(()=>{
    fetchMyGround()
  },[])


  /* ================= HANDLE INPUT ================= */

  const handleChange = (e)=>{

    if(e.target.name === "image"){

      const file = e.target.files[0]

      setFormData({...formData,image:file})

      if(file){
        setPreview(URL.createObjectURL(file))
      }

    }else{

      setFormData({
        ...formData,
        [e.target.name]:e.target.value
      })

    }

  }


  /* ================= CREATE ================= */

  const handleSubmit = async(e)=>{

    e.preventDefault()

    const data = new FormData()

    Object.keys(formData).forEach(key=>{
      if(formData[key]){
        data.append(key,formData[key])
      }
    })

    const res = await fetch(`${BASE_URL}/api/grounds/create/`,{
      method:"POST",
      headers:{Authorization:`Bearer ${token}`},
      body:data
    })

    if(res.ok){

      setMessage("Ground created successfully ✅")

      await fetchMyGround()

    }

  }


  /* ================= UPDATE ================= */

  const handleUpdate = async(e)=>{

    e.preventDefault()

    const data = new FormData()

    Object.keys(formData).forEach(key=>{
      if(formData[key]){
        data.append(key,formData[key])
      }
    })

    const res = await fetch(
      `${BASE_URL}/api/grounds/${myGround.id}/update/`,
      {
        method:"PATCH",
        headers:{Authorization:`Bearer ${token}`},
        body:data
      }
    )

    if(res.ok){

      setMessage("Ground updated successfully ✅")

      setEditMode(false)

      await fetchMyGround()

    }

  }


  /* ================= DELETE ================= */

  const handleDelete = async()=>{

    if(!window.confirm("Delete this ground?")) return

    await fetch(`${BASE_URL}/api/grounds/${myGround.id}/delete/`,{
      method:"DELETE",
      headers:{Authorization:`Bearer ${token}`}
    })

    setMyGround(null)
    setPreview(null)

  }


  /* ================= ENABLE EDIT ================= */

  const enableEdit = ()=>{

    setEditMode(true)

    setFormData({
      name:myGround.name || "",
      location:myGround.location || "",
      description:myGround.description || "",
      price_per_hour:myGround.price_per_hour || "",
      opening_time:myGround.opening_time || "",
      closing_time:myGround.closing_time || "",
      facilities:myGround.facilities || "",
      image:null
    })

  }

  const cancelEdit = ()=>{
    setEditMode(false)
  }



  return(

  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-black pt-28 px-6 pb-16">

  <div className="max-w-5xl mx-auto">

  <h1 className="text-4xl text-white text-center font-bold mb-10">
  Ground Management Dashboard 🏟
  </h1>

  {message && (
  <p className="text-green-400 text-center mb-6">
  {message}
  </p>
  )}


  {/* ================= FORM ================= */}

  {(!myGround || editMode) && (

  <div className="bg-white rounded-3xl p-10 shadow-2xl">

  <h2 className="text-2xl font-bold mb-8">
  {editMode ? "Edit Ground" : "Add New Ground"}
  </h2>

  <form
  onSubmit={editMode ? handleUpdate : handleSubmit}
  className="space-y-5"
  >

  <input
  type="text"
  name="name"
  value={formData.name}
  onChange={handleChange}
  placeholder="Ground Name"
  className="w-full border p-4 rounded-xl"
  required
  />

  <input
  type="text"
  name="location"
  value={formData.location}
  onChange={handleChange}
  placeholder="Location"
  className="w-full border p-4 rounded-xl"
  required
  />

  <textarea
  name="description"
  value={formData.description}
  onChange={handleChange}
  placeholder="Description"
  className="w-full border p-4 rounded-xl"
  />

  <input
  type="number"
  name="price_per_hour"
  value={formData.price_per_hour}
  onChange={handleChange}
  placeholder="Price per Hour"
  className="w-full border p-4 rounded-xl"
  required
  />

  <div className="grid grid-cols-2 gap-5">

  <input
  type="time"
  name="opening_time"
  value={formData.opening_time}
  onChange={handleChange}
  className="border p-4 rounded-xl"
  />

  <input
  type="time"
  name="closing_time"
  value={formData.closing_time}
  onChange={handleChange}
  className="border p-4 rounded-xl"
  />

  </div>

  <input
  type="text"
  name="facilities"
  value={formData.facilities}
  onChange={handleChange}
  placeholder="Facilities"
  className="w-full border p-4 rounded-xl"
  />

  <input
  type="file"
  name="image"
  onChange={handleChange}
  />

  {preview && (

  <img
  src={preview}
  alt="preview"
  className="w-full h-64 object-cover rounded-xl"
  />

  )}

  <div className="flex gap-4">

  <button
  className="flex-1 bg-black text-white py-3 rounded-xl hover:bg-gray-800"
  >
  {editMode ? "Update Ground" : "Add Ground"}
  </button>

  {editMode && (

  <button
  type="button"
  onClick={cancelEdit}
  className="flex-1 bg-gray-300 py-3 rounded-xl"
  >
  Cancel
  </button>

  )}

  </div>

  </form>
  </div>
  )}



  {/* ================= GROUND CARD ================= */}

  {myGround && !editMode && (

  <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mt-10">

  {preview && (

  <img
  src={preview}
  alt={myGround.name}
  className="w-full h-[420px] object-cover"
  />

  )}

  <div className="p-10">

  <h2 className="text-3xl font-bold mb-4">
  {myGround.name}
  </h2>

  <p className="mb-2">📍 {myGround.location}</p>

  <p className="mb-2">💰 Rs {myGround.price_per_hour} / hour</p>

  <p className="mb-2">🛠 {myGround.facilities}</p>

  <p className="mb-6">

  Status :

  {myGround.is_approved ?

  <span className="text-green-600 font-semibold ml-2">
  Approved
  </span>

  :

  <span className="text-yellow-600 font-semibold ml-2">
  Pending
  </span>

  }

  </p>

  <div className="flex gap-5">

  <button
  onClick={enableEdit}
  className="bg-blue-600 text-white px-6 py-2 rounded-xl"
  >
  Edit
  </button>

  <button
  onClick={handleDelete}
  className="bg-red-600 text-white px-6 py-2 rounded-xl"
  >
  Delete
  </button>

  </div>

  </div>
  </div>

  )}

  </div>
  </div>

  )

}