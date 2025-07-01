import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CameraView from "./pages/CameraView";
import PlayerLobby from "./pages/PlayerLobby";
import Landing from "./pages/Landing";
import SpectatorLobby from "./pages/SpectatorLobby";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/game" element={<CameraView />} />
        <Route path="/player_lobby" element={<PlayerLobby />} />
         <Route path="/spectator_lobby" element={<SpectatorLobby />} />
      </Routes>
    </Router>
  );
}

export default App;
