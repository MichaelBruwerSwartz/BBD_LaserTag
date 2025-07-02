import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CameraView from "./pages/CameraView";
import PlayerLobby from "./pages/PlayerLobby";
import Landing from "./pages/Landing";
import SpectatorStreaming from "./pages/SpectatorStreaming";
import PlayerLeaderboard from "./pages/PlayerLeaderboard";
import Calibration from "./pages/callibration";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/camera_view" element={<CameraView />} />
        <Route path="/player_lobby" element={<PlayerLobby />} />
        <Route path="/spectator_stream" element={<SpectatorStreaming />} />
        <Route path="/player_leaderboard" element={<PlayerLeaderboard />} />
        <Route path="/calibration" element={<Calibration />} />
      </Routes>
    </Router>
  );
}

export default App;
