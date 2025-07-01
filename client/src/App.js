import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CameraView from "./pages/CameraView";
import PlayerLobby from "./pages/PlayerLobby";
import Landing from "./pages/Landing";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/camera_view" element={<CameraView />} />
        <Route path="/player_lobby" element={<PlayerLobby />} />
      </Routes>
    </Router>
  );
}

export default App;
