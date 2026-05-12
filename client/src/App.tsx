import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import MovieDetailPage from "./pages/MovieDetailPage";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0D0D0F] text-white font-body antialiased">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movie/:slug" element={<MovieDetailPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
