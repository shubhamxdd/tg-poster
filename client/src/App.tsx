import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

const HomePage        = lazy(() => import("./pages/HomePage"));
const MovieDetailPage = lazy(() => import("./pages/MovieDetailPage"));
const AdminPage       = lazy(() => import("./pages/AdminPage"));

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0D0D0F] text-white font-body antialiased">
        <Navbar />
        <main>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/movie/:slug" element={<MovieDetailPage />} />
              <Route path="/series/:slug" element={<MovieDetailPage />} />
              <Route path="/anime/:slug" element={<MovieDetailPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;
