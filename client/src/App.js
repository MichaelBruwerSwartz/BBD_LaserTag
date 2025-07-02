import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CameraView from "./pages/CameraView";
import PlayerLobby from "./pages/PlayerLobby";
import Landing from "./pages/Landing";
import SpectatorLobby from "./pages/SpectatorLobby";
import SpectatorStreaming from "./pages/SpectatorStreaming";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/camera_view" element={<CameraView />} />
        <Route path="/player_lobby" element={<PlayerLobby />} />
        <Route path="/spectator_lobby" element={<SpectatorLobby />} />
        <Route path="/spectator_stream" element={<SpectatorStreaming />} />
      </Routes>
    </Router>
  );
}

export default App;
