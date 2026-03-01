
import { useLocation, useNavigate } from 'react-router-dom'

export default function Score() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state

  return (
    <div>
      <h1>Score: {data.score}/100</h1>
      <p>Missing: {data.missing}</p>
      <p>Duplicates: {data.duplicates}</p>
      <button onClick={()=>navigate('/auth')}>Unlock Full Report</button>
    </div>
  )
}
