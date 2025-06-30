import { Link } from "react-router-dom";
export default function Landing() {
  return (
    <div>
      Landing Page!
      <Link to="/lobby">Go to Lobby</Link>
    </div>
  );
}
