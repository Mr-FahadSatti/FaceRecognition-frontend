import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './home';
import WebcamCapture from './webCameCapture';
import CameraCapture from './webCameCapture';

export default function App() {
  return (
    <Router>
       <Routes>
          <Route path="/" element={<CameraCapture />} />
       </Routes>
    </Router>
  );
}
