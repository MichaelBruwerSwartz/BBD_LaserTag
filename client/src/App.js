import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CameraView from "./pages/CameraView";
import Lobby from "./pages/Lobby";
import Landing from "./pages/Landing";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/game" element={<CameraView />} />
        <Route path="/lobby" element={<Lobby />} />
      </Routes>
    </Router>
  );
}

export default App;
