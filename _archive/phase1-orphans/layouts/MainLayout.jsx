import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import MainLayout from "./layouts/MainLayout"

import Dashboard from "./pages/Dashboard"
import Sentiment from "./pages/Sentiment"
import Forecast from "./pages/Forecast"
import Report from "./pages/Report"

import AI from "./pages/AI"
import Crisis from "./pages/Crisis"
import Dataset from "./pages/Dataset"
import Settings from "./pages/Settings"
import Social from "./pages/Social"


function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Default route */}
        <Route
          path="/"
          element={<Navigate to="/dashboard" />}
        />


        {/* Main Application Layout */}
        <Route
          path="/"
          element={<MainLayout />}
        >

          <Route
            path="dashboard"
            element={<Dashboard />}
          />

          <Route
            path="sentiment"
            element={<Sentiment />}
          />

          <Route
            path="forecast"
            element={<Forecast />}
          />

          <Route
            path="report"
            element={<Report />}
          />

          <Route
            path="ai"
            element={<AI />}
          />

          <Route
            path="crisis"
            element={<Crisis />}
          />

          <Route
            path="dataset"
            element={<Dataset />}
          />

          <Route
            path="settings"
            element={<Settings />}
          />

          <Route
            path="social"
            element={<Social />}
          />

        </Route>


        {/* Unknown URL fallback */}
        <Route
          path="*"
          element={<Navigate to="/dashboard" />}
        />


      </Routes>

    </BrowserRouter>
  )
}


export default App