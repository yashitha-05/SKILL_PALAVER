
import { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Auth() {
  const [username,setUsername]=useState('')
  const [password,setPassword]=useState('')
  const navigate=useNavigate()

  const login=async()=>{
    await axios.post('http://localhost:8000/api/login/',{username,password})
    navigate('/dashboard')
  }

  return (
    <div>
      <h2>Login</h2>
      <input placeholder='Username' onChange={e=>setUsername(e.target.value)} />
      <input type='password' placeholder='Password' onChange={e=>setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
    </div>
  )
}
