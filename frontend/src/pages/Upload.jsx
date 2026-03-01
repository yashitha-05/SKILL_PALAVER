
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadFile } from '../api'

export default function Upload() {
  const [file, setFile] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!file) return
    try {
      const res = await uploadFile(file)
      navigate('/score', { state: res.data })
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.detail || err.message || 'Upload failed')
    }
  }

  return (
    <div>
      <h2>Upload CSV</h2>
      <input type="file" onChange={e=>setFile(e.target.files[0])} />
      <button onClick={handleSubmit}>Check Score</button>
    </div>
  )
}
